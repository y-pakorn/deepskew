import { bcs } from "@mysten/sui/bcs";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { PREDICT_PACKAGE_ID, SUI_GRPC_URL, SUI_NETWORK } from "./constants";

/**
 * Live on-chain event source for DeepBook Predict.
 *
 * The public fullnode gRPC has no by-type event subscription yet, so we tail the
 * checkpoint stream (SubscriptionService.subscribeCheckpoints) and keep only the
 * events from PREDICT_PACKAGE_ID. The stream does NOT populate Event.json — only
 * Event.contents (raw BCS) — so we BCS-decode the contents with the schemas
 * below (which mirror the Move event structs).
 *
 * The whole-chain firehose makes this leak-prone, so the discipline is strict:
 *   • abort cancels the underlying reader (pass the signal into the RPC) — never
 *     just break the loop, or the fetch stream leaks;
 *   • single reconnect loop guarded on `signal.aborted` — never stacks streams;
 *   • hot path is an early packageId compare + continue; events batched per cp;
 *   • no growing buffers — only a single resume cursor + a backoff.
 * The fullnode drops the stream ~every 30s, so we reconnect at head and the
 * consumer dedupes by digest.
 */

export type StreamStatus = "connecting" | "live" | "reconnecting";

export interface PredictEvent {
  checkpoint: number;
  txDigest: string;
  timestampMs: number; // arrival ≈ checkpoint time; the indexer poll reconciles exacts
  module: string; // e.g. "oracle" | "predict"
  eventName: string; // struct short name, e.g. "OraclePricesUpdated"
  eventType: string;
  sender: string;
  payload: Record<string, unknown>;
}

// ── BCS schemas (field order mirrors the Move event structs exactly) ────────
const I64 = bcs.struct("I64", {
  magnitude: bcs.u64(),
  is_negative: bcs.bool(),
});
const TypeName = bcs.struct("TypeName", { name: bcs.string() });

const Schemas: Record<string, { parse: (bytes: Uint8Array) => unknown }> = {
  OraclePricesUpdated: bcs.struct("OraclePricesUpdated", {
    oracle_id: bcs.Address,
    spot: bcs.u64(),
    forward: bcs.u64(),
    timestamp: bcs.u64(),
  }),
  OracleSVIUpdated: bcs.struct("OracleSVIUpdated", {
    oracle_id: bcs.Address,
    a: bcs.u64(),
    b: bcs.u64(),
    rho: I64,
    m: I64,
    sigma: bcs.u64(),
    timestamp: bcs.u64(),
  }),
  OracleSettled: bcs.struct("OracleSettled", {
    oracle_id: bcs.Address,
    expiry: bcs.u64(),
    settlement_price: bcs.u64(),
    timestamp: bcs.u64(),
  }),
  OracleActivated: bcs.struct("OracleActivated", {
    oracle_id: bcs.Address,
    expiry: bcs.u64(),
    timestamp: bcs.u64(),
  }),
  PositionMinted: bcs.struct("PositionMinted", {
    predict_id: bcs.Address,
    manager_id: bcs.Address,
    trader: bcs.Address,
    quote_asset: TypeName,
    oracle_id: bcs.Address,
    expiry: bcs.u64(),
    strike: bcs.u64(),
    is_up: bcs.bool(),
    quantity: bcs.u64(),
    cost: bcs.u64(),
    ask_price: bcs.u64(),
  }),
  PositionRedeemed: bcs.struct("PositionRedeemed", {
    predict_id: bcs.Address,
    manager_id: bcs.Address,
    owner: bcs.Address,
    executor: bcs.Address,
    quote_asset: TypeName,
    oracle_id: bcs.Address,
    expiry: bcs.u64(),
    strike: bcs.u64(),
    is_up: bcs.bool(),
    quantity: bcs.u64(),
    payout: bcs.u64(),
    bid_price: bcs.u64(),
    is_settled: bcs.bool(),
  }),
};

function decodeEvent(
  name: string,
  bytes: Uint8Array | undefined,
): Record<string, unknown> | null {
  const schema = Schemas[name];
  if (!schema || !bytes) return null;
  try {
    return schema.parse(bytes) as Record<string, unknown>;
  } catch {
    return null; // unexpected layout — let the indexer poll reconcile
  }
}

const READ_MASK = {
  paths: ["sequence_number", "transactions.digest", "transactions.events"],
};

const INITIAL_BACKOFF = 800;
const MAX_BACKOFF = 15_000;

export interface StreamHandlers {
  onBatch: (events: PredictEvent[]) => void;
  /** Fires on every checkpoint (the live network tip), even with no Predict events. */
  onCheckpoint: (seq: number) => void;
  onStatus: (status: StreamStatus) => void;
  signal: AbortSignal;
}

export async function streamPredictEvents({
  onBatch,
  onCheckpoint,
  onStatus,
  signal,
}: StreamHandlers): Promise<void> {
  const client = new SuiGrpcClient({
    network: SUI_NETWORK,
    baseUrl: SUI_GRPC_URL,
  });

  let status: StreamStatus | null = null;
  const setStatus = (s: StreamStatus) => {
    if (s !== status) {
      status = s;
      onStatus(s);
    }
  };

  let lastCursor: bigint | undefined;
  let backoff = INITIAL_BACKOFF;

  while (!signal.aborted) {
    setStatus("connecting");
    try {
      const call = client.subscriptionService.subscribeCheckpoints(
        { readMask: READ_MASK },
        { abort: signal },
      );

      for await (const res of call.responses) {
        if (signal.aborted) break;
        setStatus("live");
        backoff = INITIAL_BACKOFF; // healthy stream → reset backoff

        const cursor = res.cursor;
        // Reconnects restart at head — skip checkpoints already processed.
        if (
          lastCursor !== undefined &&
          cursor !== undefined &&
          cursor <= lastCursor
        ) {
          continue;
        }
        if (cursor !== undefined) lastCursor = cursor;

        const cp = res.checkpoint;
        if (!cp) continue;

        const seq = Number(cp.sequenceNumber ?? cursor ?? 0);
        onCheckpoint(seq);

        const ts = Date.now();
        const batch: PredictEvent[] = [];

        for (const tx of cp.transactions) {
          const events = tx.events?.events;
          if (!events?.length) continue;
          for (const ev of events) {
            if (ev.packageId !== PREDICT_PACKAGE_ID) continue; // hot-path filter
            const eventType = ev.eventType ?? "";
            const eventName = eventType.split("::").pop()?.split("<")[0] ?? "";
            const payload = decodeEvent(eventName, ev.contents?.value);
            if (!payload) continue; // unmodelled / undecodable event — ignore
            batch.push({
              checkpoint: seq,
              txDigest: tx.digest ?? "",
              timestampMs: ts,
              module: ev.module ?? "",
              eventName,
              eventType,
              sender: ev.sender ?? "",
              payload,
            });
          }
        }
        if (batch.length) onBatch(batch);
      }
    } catch {
      // swallow — RST_STREAM / abort / transient; reconnect below
    }

    if (signal.aborted) break;
    setStatus("reconnecting");
    await sleep(backoff, signal);
    backoff = Math.min(backoff * 2, MAX_BACKOFF);
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}
