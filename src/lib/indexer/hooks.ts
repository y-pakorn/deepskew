import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PREDICT_ID } from "@/lib/sui/constants";
import { decodeSvi, impliedVol, yearsToExpiry } from "@/lib/svi";
import { selectTermStructure, type TermRow } from "@/lib/term-structure";
import { useNow } from "@/lib/use-now";
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

export interface SettlementStats {
  total: number;
  wins: number;
  winRate: number;
  upWinRate: number;
  dnWinRate: number;
  payouts: number; // 1e6
}

/** Taker settlement stats from /positions/redeemed — win rate (takers vs vault). */
export function useSettlementStats(): SettlementStats {
  const { data = [] } = useQuery({
    queryKey: ["positions", "redeemed"],
    queryFn: () => indexer.positionsRedeemed(),
    refetchInterval: 10_000,
  });
  return useMemo(() => {
    const settled = data.filter((r) => r.is_settled);
    const total = settled.length;
    const wins = settled.filter((r) => r.payout > 0);
    const rate = (arr: typeof settled) =>
      arr.length
        ? (arr.filter((r) => r.payout > 0).length / arr.length) * 100
        : 0;
    return {
      total,
      wins: wins.length,
      winRate: total ? (wins.length / total) * 100 : 0,
      upWinRate: rate(settled.filter((r) => r.is_up)),
      dnWinRate: rate(settled.filter((r) => !r.is_up)),
      payouts: wins.reduce((s, r) => s + r.payout, 0),
    };
  }, [data]);
}

export interface StrikeOi {
  strike: number; // 1e9-scaled
  mny: number; // strike / spot − 1
  up: number; // # up positions at this strike
  dn: number; // # down positions
}

/** Open interest grouped by the distinct strikes actually traded on one oracle,
 *  expressed as moneyness vs `spot`. Adaptive (no fixed grid) so a handful of
 *  near-ATM strikes still read clearly. */
export function useStrikeDistribution(
  oracleId: string | null,
  spot: number | null,
): StrikeOi[] {
  const { data = [] } = useQuery({
    queryKey: ["positions", "minted"],
    queryFn: () => indexer.positionsMinted(),
    refetchInterval: 6_000,
  });
  return useMemo(() => {
    if (!oracleId || !spot || spot <= 0) return [];
    const byStrike = new Map<number, { up: number; dn: number }>();
    for (const m of data) {
      if (m.oracle_id !== oracleId) continue;
      if (Math.abs(m.strike / spot - 1) > 0.5) continue; // drop far outliers
      const cur = byStrike.get(m.strike) ?? { up: 0, dn: 0 };
      if (m.is_up) cur.up += 1;
      else cur.dn += 1;
      byStrike.set(m.strike, cur);
    }
    return [...byStrike.entries()]
      .map(([strike, c]) => ({ strike, mny: strike / spot - 1, up: c.up, dn: c.dn }))
      .sort((a, b) => a.strike - b.strike);
  }, [data, oracleId, spot]);
}

export interface LpFlow {
  series: number[]; // cumulative net (1e6)
  supplyCount: number;
  withdrawCount: number;
  supplied: number;
  withdrawn: number;
  net: number;
}

/** Cumulative LP net flow over time from /lp/supplies + /lp/withdrawals. */
export function useLpFlow(): LpFlow {
  const sup = useQuery({
    queryKey: ["lp", "supplies"],
    queryFn: () => indexer.lpSupplies(),
    refetchInterval: 20_000,
  });
  const wd = useQuery({
    queryKey: ["lp", "withdrawals"],
    queryFn: () => indexer.lpWithdrawals(),
    refetchInterval: 20_000,
  });
  return useMemo(() => {
    const ev = [
      ...(sup.data ?? []).map((s) => ({
        ts: s.checkpoint_timestamp_ms,
        delta: s.amount,
      })),
      ...(wd.data ?? []).map((w) => ({
        ts: w.checkpoint_timestamp_ms,
        delta: -w.amount,
      })),
    ].sort((a, b) => a.ts - b.ts);
    const series: number[] = [];
    let running = 0;
    for (const e of ev) {
      running += e.delta;
      series.push(running);
    }
    const supplied = (sup.data ?? []).reduce((s, x) => s + x.amount, 0);
    const withdrawn = (wd.data ?? []).reduce((s, x) => s + x.amount, 0);
    return {
      series,
      supplyCount: sup.data?.length ?? 0,
      withdrawCount: wd.data?.length ?? 0,
      supplied,
      withdrawn,
      net: supplied - withdrawn,
    };
  }, [sup.data, wd.data]);
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

/**
 * The vol term structure: active oracles → a log-spaced tenor set → decoded SVI
 * + ATM IV per tenor. Feeds both the 3-D surface and the term-structure readouts.
 * T uses each SVI's own timestamp so geometry only rebuilds on new data.
 */
export function useTermStructure(): { rows: TermRow[]; version: number } {
  const { data: oracles = [] } = useActiveOracles();
  const now = useNow();
  const refNow = Math.floor(now / 60_000) * 60_000; // re-pick at most each minute
  const tenors = useMemo(
    () => selectTermStructure(oracles, refNow),
    [oracles, refNow],
  );
  const svis = useSurfaceSvis(tenors);
  return useMemo(() => {
    const rows: TermRow[] = [];
    let version = 0;
    svis.forEach((q, i) => {
      const o = tenors[i];
      const svi = q.data;
      if (!o || !svi) return;
      const T = yearsToExpiry(o.expiry, svi.checkpoint_timestamp_ms);
      if (T <= 0) return;
      const params = decodeSvi(svi);
      rows.push({
        oracleId: o.oracle_id,
        expiry: o.expiry,
        T,
        params,
        atmIV: impliedVol(0, params, T),
      });
      version += svi.checkpoint;
    });
    rows.sort((a, b) => a.T - b.T);
    return { rows, version };
  }, [svis, tenors]);
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
