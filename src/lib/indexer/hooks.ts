import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PREDICT_ID } from "@/lib/sui/constants";
import { indexer } from "./client";
import type { OracleInfo } from "./types";

/** A merged mint/redeem flow event for the Desk feed. */
export interface FlowItem {
  kind: "mint" | "redeem";
  ts: number;
  oracleId: string;
  strike: number;
  isUp: boolean;
  amount: number; // cost (mint) or payout (redeem), 1e6
  actor: string;
  digest: string;
  settled?: boolean;
}

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

/** Spot price history for an oracle (sparkline), sorted oldest→newest. */
export function useSpotHistory(oracleId: string | null, limit = 80) {
  return useQuery({
    queryKey: ["oracle", oracleId, "prices", limit],
    queryFn: () => indexer.spotHistory(oracleId as string, limit),
    enabled: !!oracleId,
    refetchInterval: 8_000,
    select: (h) =>
      [...h].sort(
        (a, b) => a.checkpoint_timestamp_ms - b.checkpoint_timestamp_ms,
      ),
  });
}

/** Recent market flow — mints + redeems merged, newest first. Feeds the Desk. */
export function useRecentFlow(limit = 60) {
  const minted = useQuery({
    queryKey: ["positions", "minted"],
    queryFn: () => indexer.positionsMinted(),
    refetchInterval: 6_000,
  });
  const redeemed = useQuery({
    queryKey: ["positions", "redeemed"],
    queryFn: () => indexer.positionsRedeemed(),
    refetchInterval: 6_000,
  });
  const items = useMemo<FlowItem[]>(() => {
    const m: FlowItem[] = (minted.data ?? []).map((p) => ({
      kind: "mint",
      ts: p.checkpoint_timestamp_ms,
      oracleId: p.oracle_id,
      strike: p.strike,
      isUp: p.is_up,
      amount: p.cost,
      actor: p.trader,
      digest: p.digest,
    }));
    const r: FlowItem[] = (redeemed.data ?? []).map((p) => ({
      kind: "redeem",
      ts: p.checkpoint_timestamp_ms,
      oracleId: p.oracle_id,
      strike: p.strike,
      isUp: p.is_up,
      amount: p.payout,
      actor: p.owner,
      digest: p.digest,
      settled: p.is_settled,
    }));
    return [...m, ...r].sort((a, b) => b.ts - a.ts).slice(0, limit);
  }, [minted.data, redeemed.data, limit]);
  return {
    items,
    isLoading: minted.isLoading || redeemed.isLoading,
    isError: minted.isError || redeemed.isError,
  };
}

/** Latest SVI for an oracle (used by the surface across expiries). */
export function useSviLatest(oracleId: string | null) {
  return useQuery({
    queryKey: ["oracle", oracleId, "svi", "latest"],
    queryFn: () => indexer.sviLatest(oracleId as string),
    enabled: !!oracleId,
    refetchInterval: 8_000,
  });
}

/** SVI param history for an oracle (time-travel scrubber), sorted oldest→newest. */
export function useSviHistory(oracleId: string | null, limit = 150) {
  return useQuery({
    queryKey: ["oracle", oracleId, "svi", "history", limit],
    queryFn: () => indexer.sviHistory(oracleId as string, limit),
    enabled: !!oracleId,
    refetchInterval: 15_000,
    select: (h) =>
      [...h].sort(
        (a, b) => a.checkpoint_timestamp_ms - b.checkpoint_timestamp_ms,
      ),
  });
}

/** Latest SVI for many oracles at once — feeds the 3-D surface. Shares query
 *  keys with useSviLatest/useOracleState, so the selected oracle is deduped. */
export function useSurfaceSvis(oracles: OracleInfo[]) {
  return useQueries({
    queries: oracles.map((o) => ({
      queryKey: ["oracle", o.oracle_id, "svi", "latest"],
      queryFn: () => indexer.sviLatest(o.oracle_id),
      enabled: !!o.oracle_id,
      refetchInterval: 8_000,
      staleTime: 4_000,
    })),
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

/** PLP share-price / vault-value time series — the performance chart. */
export function useVaultPerformance(predictId: string = PREDICT_ID, range = "ALL") {
  return useQuery({
    queryKey: ["predict", predictId, "vault", "performance", range],
    queryFn: () => indexer.vaultPerformance(predictId, range),
    refetchInterval: 30_000,
  });
}
