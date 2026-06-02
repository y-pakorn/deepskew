import { useQuery } from "@tanstack/react-query";
import { PREDICT_ID } from "@/lib/sui/constants";
import { indexer } from "./client";

/** Indexer sync/health — powers the `● live · lag Ns` pill. */
export function useIndexerStatus() {
  return useQuery({
    queryKey: ["indexer", "status"],
    queryFn: () => indexer.status(),
    refetchInterval: 5_000,
  });
}

/** All oracles → active only, sorted by nearest expiry. Heavy payload, so it
 *  polls slowly; the active set rolls ~every 15 min. */
export function useActiveOracles() {
  return useQuery({
    queryKey: ["oracles", "active"],
    queryFn: () => indexer.oracles(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    select: (all) =>
      all
        .filter((o) => o.status === "active")
        .sort((a, b) => a.expiry - b.expiry),
  });
}

/** One-shot oracle state (meta + spot/forward + SVI) for the selected oracle. */
export function useOracleState(oracleId: string | null) {
  return useQuery({
    queryKey: ["oracle", oracleId, "state"],
    queryFn: () => indexer.oracleState(oracleId as string),
    enabled: !!oracleId,
    refetchInterval: 8_000,
  });
}

/** Latest SVI params for an oracle (used by the surface across expiries). */
export function useSviLatest(oracleId: string | null) {
  return useQuery({
    queryKey: ["oracle", oracleId, "svi", "latest"],
    queryFn: () => indexer.sviLatest(oracleId as string),
    enabled: !!oracleId,
    refetchInterval: 8_000,
  });
}

/** PLP vault summary — the risk numbers. */
export function useVaultSummary(predictId: string = PREDICT_ID) {
  return useQuery({
    queryKey: ["predict", predictId, "vault", "summary"],
    queryFn: () => indexer.vaultSummary(predictId),
    refetchInterval: 15_000,
  });
}
