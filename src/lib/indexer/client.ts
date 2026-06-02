import { INDEXER_BASE_URL } from "@/lib/sui/constants";
import type {
  IndexerStatus,
  ManagerPnl,
  OracleRef,
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

/**
 * Typed client for the Predict indexer (Tier 1 — history & aggregates).
 * Routes reverse-engineered from crates/predict-server/src/server.rs.
 */
export const indexer = {
  status: () => get<IndexerStatus>("/status"),
  config: () => get<Record<string, unknown>>("/config"),
  oracles: () => get<OracleRef[]>("/oracles"),
  spotLatest: (oracleId: string) =>
    get<unknown>(`/oracles/${oracleId}/prices/latest`),
  spotHistory: (oracleId: string) =>
    get<unknown[]>(`/oracles/${oracleId}/prices`),
  sviLatest: (oracleId: string) =>
    get<SviLatest>(`/oracles/${oracleId}/svi/latest`),
  sviHistory: (oracleId: string) => get<SviLatest[]>(`/oracles/${oracleId}/svi`),
  oracleState: (oracleId: string) =>
    get<unknown>(`/oracles/${oracleId}/state`),
  askBounds: (oracleId: string) =>
    get<unknown>(`/oracles/${oracleId}/ask-bounds`),
  vaultSummary: (predictId: string) =>
    get<VaultSummary>(`/predicts/${predictId}/vault/summary`),
  vaultPerformance: (predictId: string, range = "ALL") =>
    get<VaultPerformance>(
      `/predicts/${predictId}/vault/performance?range=${range}`,
    ),
  managerPnl: (managerId: string, seriesType = "realized_pnl", range = "ALL") =>
    get<ManagerPnl>(
      `/managers/${managerId}/pnl?series_type=${seriesType}&range=${range}`,
    ),
  managerPositions: (managerId: string) =>
    get<unknown[]>(`/managers/${managerId}/positions`),
  positionsMinted: () => get<unknown[]>("/positions/minted"),
  positionsRedeemed: () => get<unknown[]>("/positions/redeemed"),
};

export type Indexer = typeof indexer;
