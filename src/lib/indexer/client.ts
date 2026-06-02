import { INDEXER_BASE_URL } from "@/lib/sui/constants";
import type {
  IndexerStatus,
  ManagerPnl,
  LpSupply,
  LpWithdrawal,
  OracleInfo,
  OraclePrice,
  OracleStateResponse,
  PositionMinted,
  PositionRedeemed,
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

/**
 * Typed client for the Predict indexer (Tier 1 — history & aggregates).
 * Routes from crates/predict-server/src/server.rs (predict-testnet-4-16).
 */
export const indexer = {
  status: () => get<IndexerStatus>("/status"),
  config: () => get<Record<string, unknown>>("/config"),
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
  /** One-shot: oracle meta + latest price + latest SVI. */
  oracleState: (oracleId: string) =>
    get<OracleStateResponse>(`/oracles/${oracleId}/state`),
  askBounds: (oracleId: string) =>
    get<unknown>(`/oracles/${oracleId}/ask-bounds`),
  vaultSummary: (predictId: string) =>
    get<VaultSummary>(`/predicts/${predictId}/vault/summary`),
  vaultPerformance: (predictId: string, range = "ALL") =>
    get<VaultPerformance>(
      `/predicts/${predictId}/vault/performance?range=${range}`,
    ),
  managerPnl: (managerId: string, range = "ALL") =>
    get<ManagerPnl>(`/managers/${managerId}/pnl?range=${range}`),
  managerPositions: (managerId: string) =>
    get<unknown[]>(`/managers/${managerId}/positions`),
  positionsMinted: () => get<PositionMinted[]>("/positions/minted"),
  positionsRedeemed: () => get<PositionRedeemed[]>("/positions/redeemed"),
  lpSupplies: () => get<LpSupply[]>("/lp/supplies"),
  lpWithdrawals: () => get<LpWithdrawal[]>("/lp/withdrawals"),
};

export type Indexer = typeof indexer;
