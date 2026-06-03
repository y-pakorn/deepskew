"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PREDICT_PACKAGE_ID } from "@/lib/sui/constants";
import {
  type PredictEvent,
  type StreamStatus,
  streamPredictEvents,
} from "@/lib/sui/events";
import type {
  IndexerStatus,
  OraclePrice,
  OracleStateResponse,
  PositionMinted,
  PositionRedeemed,
  SviLatest,
} from "./types";

// Hard caps on live-merged arrays. A safety belt only: the indexer poll REPLACES
// these caches every few seconds, so live merges are transient and can't grow
// unbounded — the cap just bounds the window between polls.
const FEED_CAP = 250;
const PRICES_CAP = 200;
const SVI_HIST_CAP = 200;
const SPARK_LIMIT = 80; // must match useSpotHistory's default `limit`
const SVI_HIST_LIMIT = 150; // must match useSviHistory's default `limit`

const num = (x: unknown): number => Number(x ?? 0);
const str = (x: unknown): string => String(x ?? "");

function toMinted(e: PredictEvent): PositionMinted {
  const p = e.payload;
  return {
    checkpoint_timestamp_ms: e.timestampMs,
    digest: e.txDigest,
    trader: str(p.trader),
    oracle_id: str(p.oracle_id),
    expiry: num(p.expiry),
    strike: num(p.strike),
    is_up: !!p.is_up,
    quantity: num(p.quantity),
    cost: num(p.cost),
    ask_price: num(p.ask_price),
  };
}

function toRedeemed(e: PredictEvent): PositionRedeemed {
  const p = e.payload;
  return {
    checkpoint_timestamp_ms: e.timestampMs,
    digest: e.txDigest,
    owner: str(p.owner),
    oracle_id: str(p.oracle_id),
    expiry: num(p.expiry),
    strike: num(p.strike),
    is_up: !!p.is_up,
    quantity: num(p.quantity),
    payout: num(p.payout),
    is_settled: !!p.is_settled,
  };
}

function toPrice(e: PredictEvent): OraclePrice {
  const p = e.payload;
  return {
    event_digest: e.txDigest,
    digest: e.txDigest,
    sender: e.sender,
    checkpoint: e.checkpoint,
    checkpoint_timestamp_ms: e.timestampMs,
    tx_index: 0,
    event_index: 0,
    package: PREDICT_PACKAGE_ID,
    oracle_id: str(p.oracle_id),
    spot: num(p.spot),
    forward: num(p.forward),
    onchain_timestamp: num(p.timestamp),
  };
}

function toSvi(e: PredictEvent): SviLatest {
  const p = e.payload;
  // rho / m are decoded i64::I64 structs: { magnitude: u64, is_negative: bool }.
  const rho = (p.rho ?? {}) as { magnitude?: unknown; is_negative?: unknown };
  const m = (p.m ?? {}) as { magnitude?: unknown; is_negative?: unknown };
  return {
    event_digest: e.txDigest,
    digest: e.txDigest,
    sender: e.sender,
    checkpoint: e.checkpoint,
    checkpoint_timestamp_ms: e.timestampMs,
    tx_index: 0,
    event_index: 0,
    package: PREDICT_PACKAGE_ID,
    oracle_id: str(p.oracle_id),
    a: num(p.a),
    b: num(p.b),
    rho: num(rho.magnitude),
    rho_negative: !!rho.is_negative,
    m: num(m.magnitude),
    m_negative: !!m.is_negative,
    sigma: num(p.sigma),
    onchain_timestamp: num(p.timestamp),
  };
}

/** Prepend fresh items, dedupe vs the existing array by digest (covers poll +
 *  reconnect replay), and cap. New array (immutable) so React Query re-renders. */
function mergeFeed<T extends { digest: string }>(
  prev: T[] | undefined,
  items: T[],
  cap: number,
): T[] {
  const base = prev ?? [];
  if (!items.length) return base;
  const seen = new Set(base.map((x) => x.digest));
  const fresh = items.filter((x) => !seen.has(x.digest));
  if (!fresh.length) return base;
  return [...fresh, ...base].slice(0, cap);
}

/**
 * Mounts the live on-chain feed once and merges normalised events into the
 * EXISTING React Query cache — no parallel store, no hook changes:
 *   • PositionMinted/Redeemed → ["positions",…] (desk tape, ticker, positioning
 *     bar, settlement stats, strike histogram — all at once);
 *   • OraclePricesUpdated → the selected oracle's ["oracle",id,"state"].latest_price
 *     + sparkline; OracleSVIUpdated → latest_svi + svi latest/history (smile, surface);
 *   • every checkpoint → the live network tip in ["indexer","status"] (footer Ckpt);
 *   • OracleSettled/Activated → a fast refetch (lifecycle deltas).
 * Price/SVI/SVI-history and the refetch only touch oracle caches ALREADY on screen,
 * so the firehose never spawns cache entries or renders for unwatched oracles.
 * Dedupe by digest; the indexer poll stays as a self-healing backstop.
 */
export function useLiveEvents(): StreamStatus {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>("connecting");

  useEffect(() => {
    const controller = new AbortController();

    const onBatch = (events: PredictEvent[]) => {
      const mints: PositionMinted[] = [];
      const redeems: PositionRedeemed[] = [];
      const prices = new Map<string, OraclePrice>(); // latest per oracle in this batch
      const svis = new Map<string, SviLatest>();
      const refetch = new Set<string>();

      for (const e of events) {
        if (e.module === "predict") {
          if (e.eventName === "PositionMinted") mints.push(toMinted(e));
          else if (e.eventName === "PositionRedeemed")
            redeems.push(toRedeemed(e));
        } else if (e.module === "oracle") {
          if (e.eventName === "OraclePricesUpdated") {
            const pr = toPrice(e);
            prices.set(pr.oracle_id, pr);
          } else if (e.eventName === "OracleSVIUpdated") {
            const sv = toSvi(e);
            svis.set(sv.oracle_id, sv);
          } else if (
            e.eventName === "OracleSettled" ||
            e.eventName === "OracleActivated"
          ) {
            refetch.add(str(e.payload.oracle_id));
          }
        }
      }

      // One cache write per key per checkpoint (not per event).
      if (mints.length) {
        qc.setQueryData<PositionMinted[]>(["positions", "minted"], (prev) =>
          mergeFeed(prev, mints, FEED_CAP),
        );
      }
      if (redeems.length) {
        qc.setQueryData<PositionRedeemed[]>(["positions", "redeemed"], (prev) =>
          mergeFeed(prev, redeems, FEED_CAP),
        );
      }
      for (const [oid, pr] of prices) {
        const stateKey = ["oracle", oid, "state"];
        if (qc.getQueryData(stateKey) !== undefined) {
          qc.setQueryData<OracleStateResponse>(stateKey, (prev) =>
            prev ? { ...prev, latest_price: pr } : prev,
          );
        }
        const priceKey = ["oracle", oid, "prices", SPARK_LIMIT];
        if (qc.getQueryData(priceKey) !== undefined) {
          qc.setQueryData<OraclePrice[]>(priceKey, (prev) =>
            mergeFeed(prev, [pr], PRICES_CAP),
          );
        }
      }
      for (const [oid, sv] of svis) {
        const stateKey = ["oracle", oid, "state"];
        if (qc.getQueryData(stateKey) !== undefined) {
          qc.setQueryData<OracleStateResponse>(stateKey, (prev) =>
            prev ? { ...prev, latest_svi: sv } : prev,
          );
        }
        const latestKey = ["oracle", oid, "svi", "latest"];
        if (qc.getQueryData(latestKey) !== undefined) {
          qc.setQueryData<SviLatest>(latestKey, () => sv);
        }
        const histKey = ["oracle", oid, "svi", "history", SVI_HIST_LIMIT];
        if (qc.getQueryData(histKey) !== undefined) {
          qc.setQueryData<SviLatest[]>(histKey, (prev) => {
            const base = prev ?? [];
            if (base.some((x) => x.digest === sv.digest)) return base;
            return [...base, sv].slice(-SVI_HIST_CAP);
          });
        }
      }
      for (const oid of refetch) {
        if (qc.getQueryData(["oracle", oid, "state"]) !== undefined) {
          qc.invalidateQueries({ queryKey: ["oracle", oid, "state"] });
          qc.invalidateQueries({ queryKey: ["oracle", oid, "svi"] });
        }
      }
    };

    void streamPredictEvents({
      onBatch,
      onCheckpoint: (seq) => {
        // The live network tip → footer "Ckpt", ahead of the 5s indexer poll.
        qc.setQueryData<IndexerStatus>(["indexer", "status"], (prev) =>
          prev && seq > prev.latest_onchain_checkpoint
            ? { ...prev, latest_onchain_checkpoint: seq }
            : prev,
        );
      },
      onStatus: setStatus,
      signal: controller.signal,
    });

    return () => controller.abort();
  }, [qc]);

  return status;
}
