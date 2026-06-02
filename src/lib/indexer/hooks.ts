import { useQuery } from "@tanstack/react-query";
import { DEFAULT_ORACLE_ID, PREDICT_ID } from "@/lib/sui/constants";
import { indexer } from "./client";

/** Indexer sync/health — powers the `● live · lag Ns` pill. */
export function useIndexerStatus() {
  return useQuery({
    queryKey: ["indexer", "status"],
    queryFn: () => indexer.status(),
    refetchInterval: 5_000,
  });
}

/** Latest SVI params for an oracle (smile + surface). */
export function useSviLatest(oracleId: string = DEFAULT_ORACLE_ID) {
  return useQuery({
    queryKey: ["oracle", oracleId, "svi", "latest"],
    queryFn: () => indexer.sviLatest(oracleId),
    refetchInterval: 8_000,
  });
}

/** Oracle state machine (active/settled, expiry). */
export function useOracleState(oracleId: string = DEFAULT_ORACLE_ID) {
  return useQuery({
    queryKey: ["oracle", oracleId, "state"],
    queryFn: () => indexer.oracleState(oracleId),
    refetchInterval: 30_000,
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
