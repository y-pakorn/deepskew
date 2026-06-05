import { INDEXER_BASE_URL } from "@/lib/sui/constants";
import type {
  IndexerStatus,
  ManagerCreated,
  ManagerPnl,
  ManagerPositionSummary,
  ManagerRangePositions,
  ManagerSummary,
  ManagerTrades,
  LpSupply,
  LpWithdrawal,
  OracleAskBounds,
  OracleInfo,
  OraclePrice,
  OracleStateResponse,
  PositionMinted,
  PositionRedeemed,
  PredictConfig,
  RangeMinted,
  RangeRedeemed,
  SviLatest,
  VaultPerformance,
  VaultSummary,
} from "./types";

export class IndexerError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message: string,
  ) {
    super(message);
    this.name = "IndexerError";
  }
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  // The indexer sends `access-control-allow-origin: *`, so call it directly
  // from the browser and the server alike — no proxy needed.
  const url = `${INDEXER_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { accept: "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new IndexerError(
      res.status,
      url,
      `Predict indexer responded ${res.status} for ${path}`,
    );
  }
  return res.json() as Promise<T>;
}

const limitQuery = (limit?: number) => (limit ? `?limit=${limit}` : "");

/** A tiny concurrency gate. The per-manager summary/positions/pnl routes each do
 *  an on-chain dev-inspect server-side, so a leaderboard fan-out can 429 the
 *  indexer. Cap their concurrency to smooth the burst. */
function makeLimiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => queue.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}
const managerLimit = makeLimiter(3);

/**
 * Typed client for the Predict indexer (Tier 1 — history & aggregates).
 * Routes from crates/predict-server/src/server.rs (predict-testnet-4-16).
 */
export const indexer = {
  status: () => get<IndexerStatus>("/status"),
  /** Live house rules (pricing/risk/trading_paused may be null until published). */
  config: () => get<PredictConfig>("/config"),
  predictState: (predictId: string) =>
    get<PredictConfig>(`/predicts/${predictId}/state`),
  /** All oracles (no server-side filter — ~3k entries; filter client-side). */
  oracles: () => get<OracleInfo[]>("/oracles"),
  spotLatest: (oracleId: string) =>
    get<OraclePrice>(`/oracles/${oracleId}/prices/latest`),
  spotHistory: (oracleId: string, limit?: number) =>
    get<OraclePrice[]>(`/oracles/${oracleId}/prices${limitQuery(limit)}`),
  sviLatest: (oracleId: string) =>
    get<SviLatest>(`/oracles/${oracleId}/svi/latest`),
  sviHistory: (oracleId: string, limit?: number) =>
    get<SviLatest[]>(`/oracles/${oracleId}/svi${limitQuery(limit)}`),
  /** One-shot: oracle meta + latest price + latest SVI + ask bounds. */
  oracleState: (oracleId: string) =>
    get<OracleStateResponse>(`/oracles/${oracleId}/state`),
  /** Latest mintable ask-price clamp for an oracle, or null when unset. */
  oracleAskBounds: (oracleId: string) =>
    get<OracleAskBounds | null>(`/oracles/${oracleId}/ask-bounds`),
  vaultSummary: (predictId: string) =>
    get<VaultSummary>(`/predicts/${predictId}/vault/summary`),
  vaultPerformance: (predictId: string, range = "ALL") =>
    get<VaultPerformance>(
      `/predicts/${predictId}/vault/performance?range=${range}`,
    ),
  managerPnl: (managerId: string, range = "ALL") =>
    managerLimit(() =>
      get<ManagerPnl>(`/managers/${managerId}/pnl?range=${range}`),
    ),
  managerSummary: (managerId: string) =>
    managerLimit(() =>
      get<ManagerSummary>(`/managers/${managerId}/summary`),
    ),
  managerPositionsSummary: (managerId: string) =>
    managerLimit(() =>
      get<ManagerPositionSummary[]>(
        `/managers/${managerId}/positions/summary`,
      ),
    ),
  /** Raw per-manager event queries (cheap — no on-chain dev-inspect). */
  managerTrades: (managerId: string) =>
    get<ManagerTrades>(`/managers/${managerId}/positions`),
  managerRanges: (managerId: string) =>
    get<ManagerRangePositions>(`/managers/${managerId}/ranges`),
  /** Owner↔manager directory. With `owner`, only that owner's managers. */
  managers: (owner?: string) =>
    get<ManagerCreated[]>(`/managers${owner ? `?owner=${owner}` : ""}`),
  positionsMinted: (limit?: number) =>
    get<PositionMinted[]>(`/positions/minted${limitQuery(limit)}`),
  positionsRedeemed: (limit?: number) =>
    get<PositionRedeemed[]>(`/positions/redeemed${limitQuery(limit)}`),
  rangesMinted: (limit?: number) =>
    get<RangeMinted[]>(`/ranges/minted${limitQuery(limit)}`),
  rangesRedeemed: (limit?: number) =>
    get<RangeRedeemed[]>(`/ranges/redeemed${limitQuery(limit)}`),
  lpSupplies: () => get<LpSupply[]>("/lp/supplies"),
  lpWithdrawals: () => get<LpWithdrawal[]>("/lp/withdrawals"),
};

export type Indexer = typeof indexer;
