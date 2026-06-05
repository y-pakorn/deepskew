import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { MarkMap, OracleMark } from "@/lib/analytics";
import { PREDICT_ID } from "@/lib/sui/constants";
import { decodeSvi, impliedVol, yearsToExpiry } from "@/lib/svi";
import { selectTermStructure, type TermRow } from "@/lib/term-structure";
import { useNow } from "@/lib/use-now";
import { indexer } from "./client";
import type {
  ManagerPositionSummary,
  ManagerSummary,
  OracleInfo,
  PositionMinted,
  PositionRedeemed,
  RangeMinted,
  RangeRedeemed,
} from "./types";

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

export interface LpEvent {
  ts: number;
  type: "supply" | "withdraw";
  amount: number; // 1e6
  actor: string;
}

export interface LpFlow {
  series: number[]; // cumulative net (1e6)
  events: LpEvent[]; // recent supplies + withdrawals, newest first
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
    const events: LpEvent[] = [
      ...(sup.data ?? []).map((s) => ({
        ts: s.checkpoint_timestamp_ms,
        type: "supply" as const,
        amount: s.amount,
        actor: s.supplier,
      })),
      ...(wd.data ?? []).map((w) => ({
        ts: w.checkpoint_timestamp_ms,
        type: "withdraw" as const,
        amount: w.amount,
        actor: w.withdrawer,
      })),
    ].sort((a, b) => b.ts - a.ts);
    return {
      series,
      events,
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

/** Live house rules (spread/risk config + trading-paused). Fields may be null
 *  until published on-chain — callers must degrade gracefully. */
export function usePredictConfig(predictId: string = PREDICT_ID) {
  return useQuery({
    queryKey: ["predict", predictId, "config"],
    queryFn: () => indexer.predictState(predictId),
    refetchInterval: 30_000,
  });
}

/** Latest mintable ask-price clamp for an oracle (often null on testnet). */
export function useOracleAskBounds(oracleId: string | null) {
  return useQuery({
    queryKey: ["oracle", oracleId, "ask-bounds"],
    queryFn: () => indexer.oracleAskBounds(oracleId as string),
    enabled: !!oracleId,
    refetchInterval: 15_000,
  });
}

// ─── Live oracle marks (per-oracle SVI + forward → fair binary pricing) ──────

/**
 * Marks for every active oracle: decoded SVI, live forward, T, ATM IV and
 * settlement state — the context that prices any on-chain binary to fair value.
 * Fans out /oracles/:id/state across the active set (the selected oracle dedupes
 * with useOracleState). Powers the edge tape, attribution and scenario engine.
 */
export function useActiveOracleMarks(): {
  marks: MarkMap;
  total: number;
  priced: number;
} {
  const { data: oracles = [] } = useActiveOracles();
  const states = useQueries({
    queries: oracles.map((o) => ({
      queryKey: ["oracle", o.oracle_id, "state"],
      queryFn: () => indexer.oracleState(o.oracle_id),
      enabled: !!o.oracle_id,
      refetchInterval: 10_000,
      staleTime: 5_000,
    })),
  });
  return useMemo(() => {
    const marks: MarkMap = new Map();
    let priced = 0;
    states.forEach((q, i) => {
      const o = oracles[i];
      const st = q.data;
      if (!o || !st) return;
      const svi = st.latest_svi;
      const forward = st.latest_price?.forward ?? 0;
      const spot = st.latest_price?.spot ?? 0;
      const params = svi ? decodeSvi(svi) : null;
      const T = svi ? yearsToExpiry(o.expiry, svi.checkpoint_timestamp_ms) : 0;
      const atmIV = params && T > 0 ? impliedVol(0, params, T) : 0;
      const lastUpdateMs = Math.max(
        svi?.checkpoint_timestamp_ms ?? 0,
        st.latest_price?.checkpoint_timestamp_ms ?? 0,
      );
      marks.set(o.oracle_id, {
        oracleId: o.oracle_id,
        params,
        forward,
        spot,
        T,
        atmIV,
        status: o.status,
        settlementPrice: o.settlement_price,
        expiry: o.expiry,
        lastUpdateMs,
      } satisfies OracleMark);
      if (params && forward > 0 && T > 0) priced += 1;
    });
    return { marks, total: oracles.length, priced };
  }, [states, oracles]);
}

/** A larger minted/redeemed window for book reconstruction. `truncated` warns
 *  when the result hit the server limit (so reconstructed exposure is a lower
 *  bound, not the full book). */
export function useBookFlow(limit = 500): {
  mints: PositionMinted[];
  redeems: PositionRedeemed[];
  truncated: boolean;
  isLoading: boolean;
  isError: boolean;
} {
  const minted = useQuery({
    queryKey: ["positions", "minted", limit],
    queryFn: () => indexer.positionsMinted(limit),
    refetchInterval: 12_000,
  });
  const redeemed = useQuery({
    queryKey: ["positions", "redeemed", limit],
    queryFn: () => indexer.positionsRedeemed(limit),
    refetchInterval: 12_000,
  });
  const mints = minted.data ?? [];
  const redeems = redeemed.data ?? [];
  return {
    mints,
    redeems,
    truncated: mints.length >= limit || redeems.length >= limit,
    isLoading: minted.isLoading || redeemed.isLoading,
    isError: minted.isError || redeemed.isError,
  };
}

// ─── Accounts: manager leaderboard + connected-wallet blotter ────────────────

export interface CohortRow {
  managerId: string;
  owner: string;
  volume: number; // 1e6 traded premium in window
  equity: number[]; // cumulative net cashflow series (1e6)
}

/**
 * Active desks in the flow window, ranked by traded volume — fully client-side,
 * no per-manager fetches. The leaderboard paginates this and fetches summaries
 * only for the visible page (see `useManagerSummaries`).
 */
export function useManagerCohort(): { rows: CohortRow[]; isLoading: boolean } {
  const { mints, redeems, isLoading } = useBookFlow(1000);
  return useMemo(() => {
    const map = new Map<string, { owner: string; volume: number }>();
    const evs = new Map<string, { ts: number; delta: number }[]>();
    const pushEv = (id: string, ts: number, delta: number) => {
      const arr = evs.get(id);
      if (arr) arr.push({ ts, delta });
      else evs.set(id, [{ ts, delta }]);
    };
    for (const m of mints) {
      const e = map.get(m.manager_id) ?? { owner: m.trader, volume: 0 };
      e.volume += m.cost;
      map.set(m.manager_id, e);
      pushEv(m.manager_id, m.checkpoint_timestamp_ms, -m.cost);
    }
    for (const r of redeems) {
      const e = map.get(r.manager_id) ?? { owner: r.owner, volume: 0 };
      e.volume += r.payout;
      map.set(r.manager_id, e);
      pushEv(r.manager_id, r.checkpoint_timestamp_ms, r.payout);
    }
    const equity = (id: string): number[] => {
      const list = (evs.get(id) ?? []).sort((a, b) => a.ts - b.ts);
      let run = 0;
      return list.map((e) => (run += e.delta));
    };
    const rows: CohortRow[] = [...map.entries()]
      .map(([managerId, v]) => ({
        managerId,
        owner: v.owner,
        volume: v.volume,
        equity: equity(managerId),
      }))
      .sort((a, b) => b.volume - a.volume);
    return { rows, isLoading };
  }, [mints, redeems, isLoading]);
}

/**
 * Authoritative summaries for a specific set of managers — the visible
 * leaderboard page only. The summary route does an on-chain dev-inspect
 * server-side, so it's gated to 3 concurrent (client) + cached 5 min; React
 * Query caches per id, so paging back and forth never re-fetches.
 */
export function useManagerSummaries(ids: string[]): {
  byId: Map<string, ManagerSummary>;
  loaded: number;
  isLoading: boolean;
} {
  const summaries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["manager", id, "summary"],
      queryFn: () => indexer.managerSummary(id),
      staleTime: 300_000,
      refetchInterval: false as const,
      retry: 0,
    })),
  });
  const byId = new Map<string, ManagerSummary>();
  summaries.forEach((q, i) => {
    if (q.data) byId.set(ids[i], q.data);
  });
  return {
    byId,
    loaded: byId.size,
    isLoading: summaries.some((q) => q.isLoading),
  };
}

/** The owner↔manager directory (all managers, or one owner's). */
export function useManagers(owner?: string) {
  return useQuery({
    queryKey: ["managers", owner ?? "all"],
    queryFn: () => indexer.managers(owner),
    refetchInterval: owner ? 15_000 : 60_000,
    staleTime: 30_000,
  });
}

/** Authoritative per-manager account summary. */
export function useManagerSummary(managerId: string | null) {
  return useQuery({
    queryKey: ["manager", managerId, "summary"],
    queryFn: () => indexer.managerSummary(managerId as string),
    enabled: !!managerId,
    refetchInterval: 15_000,
  });
}

/** Per-manager realized-PnL series (range = 1D/1W/1M/3M/ALL). */
export function useManagerPnl(managerId: string | null, range = "ALL") {
  return useQuery({
    queryKey: ["manager", managerId, "pnl", range],
    queryFn: () => indexer.managerPnl(managerId as string, range),
    enabled: !!managerId,
    refetchInterval: 30_000,
  });
}

/** Per-manager mark-priced position book (server-side marks). */
export function useManagerPositions(managerId: string | null) {
  return useQuery({
    queryKey: ["manager", managerId, "positions-summary"],
    queryFn: () => indexer.managerPositionsSummary(managerId as string),
    enabled: !!managerId,
    refetchInterval: 15_000,
  });
}

/** A manager's raw binary trade tape (mints + redeems merged, newest first). */
export function useManagerTrades(managerId: string | null): {
  items: FlowItem[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["manager", managerId, "trades"],
    queryFn: () => indexer.managerTrades(managerId as string),
    enabled: !!managerId,
    refetchInterval: 15_000,
  });
  const items = useMemo<FlowItem[]>(() => {
    const m: FlowItem[] = (data?.minted ?? []).map((p) => ({
      kind: "mint",
      ts: p.checkpoint_timestamp_ms,
      oracleId: p.oracle_id,
      strike: p.strike,
      isUp: p.is_up,
      amount: p.cost,
      actor: p.trader,
      digest: p.digest,
    }));
    const r: FlowItem[] = (data?.redeemed ?? []).map((p) => ({
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
    return [...m, ...r].sort((a, b) => b.ts - a.ts);
  }, [data]);
  return { items, isLoading };
}

/** A manager's range (vertical-spread) positions. */
export function useManagerRanges(managerId: string | null) {
  return useQuery({
    queryKey: ["manager", managerId, "ranges"],
    queryFn: () => indexer.managerRanges(managerId as string),
    enabled: !!managerId,
    refetchInterval: 20_000,
  });
}

/** The connected wallet's owner address + its manager account ids. */
export function useAccount(): { owner: string | null; managerIds: string[] } {
  const account = useCurrentAccount();
  const owner = account?.address ?? null;
  const { data = [] } = useQuery({
    queryKey: ["managers", "owner", owner],
    queryFn: () => indexer.managers(owner as string),
    enabled: !!owner,
    refetchInterval: 20_000,
  });
  return { owner, managerIds: data.map((m) => m.manager_id) };
}

export interface AccountSummary {
  accountValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  openExposure: number;
  redeemableValue: number;
  openPositions: number;
  awaiting: number;
  balance: number;
}

export interface AccountBlotter {
  positions: ManagerPositionSummary[];
  summary: AccountSummary | null;
  isLoading: boolean;
  hasAccount: boolean;
}

/** The connected wallet's mark-priced position book + account roll-up,
 *  aggregated across all of its manager accounts. */
export function useAccountBlotter(): AccountBlotter {
  const { owner, managerIds } = useAccount();
  const summaries = useQueries({
    queries: managerIds.map((id) => ({
      queryKey: ["manager", id, "summary"],
      queryFn: () => indexer.managerSummary(id),
      refetchInterval: 12_000,
    })),
  });
  const positionsQ = useQueries({
    queries: managerIds.map((id) => ({
      queryKey: ["manager", id, "positions-summary"],
      queryFn: () => indexer.managerPositionsSummary(id),
      refetchInterval: 12_000,
    })),
  });
  return useMemo(() => {
    const positions = positionsQ
      .flatMap((q) => q.data ?? [])
      .sort((a, b) => b.last_activity_at - a.last_activity_at);
    const sums = summaries
      .map((q) => q.data)
      .filter((d): d is ManagerSummary => !!d);
    const summary: AccountSummary | null = sums.length
      ? sums.reduce<AccountSummary>(
          (acc, s) => ({
            accountValue: acc.accountValue + s.account_value,
            realizedPnl: acc.realizedPnl + s.realized_pnl,
            unrealizedPnl: acc.unrealizedPnl + s.unrealized_pnl,
            openExposure: acc.openExposure + s.open_exposure,
            redeemableValue: acc.redeemableValue + s.redeemable_value,
            openPositions: acc.openPositions + s.open_positions,
            awaiting: acc.awaiting + s.awaiting_settlement_positions,
            balance: acc.balance + s.trading_balance,
          }),
          {
            accountValue: 0,
            realizedPnl: 0,
            unrealizedPnl: 0,
            openExposure: 0,
            redeemableValue: 0,
            openPositions: 0,
            awaiting: 0,
            balance: 0,
          },
        )
      : null;
    return {
      positions,
      summary,
      isLoading:
        summaries.some((q) => q.isLoading) ||
        positionsQ.some((q) => q.isLoading),
      hasAccount: !!owner && managerIds.length > 0,
    };
  }, [positionsQ, summaries, owner, managerIds]);
}

// ─── Range (vertical-spread) flow ────────────────────────────────────────────

export interface RangeFlowItem {
  kind: "mint" | "redeem";
  ts: number;
  oracleId: string;
  lower: number; // 1e9
  higher: number; // 1e9
  qty: number; // 1e6
  amount: number; // cost (mint) or payout (redeem), 1e6
  actor: string;
  digest: string;
  settled?: boolean;
}

/** Recent range mints + redeems merged newest-first, plus the raw arrays. */
export function useRangeFlow(limit = 80): {
  items: RangeFlowItem[];
  mints: RangeMinted[];
  redeems: RangeRedeemed[];
  isLoading: boolean;
  isError: boolean;
} {
  const minted = useQuery({
    queryKey: ["ranges", "minted", limit],
    queryFn: () => indexer.rangesMinted(limit),
    refetchInterval: 10_000,
  });
  const redeemed = useQuery({
    queryKey: ["ranges", "redeemed", limit],
    queryFn: () => indexer.rangesRedeemed(limit),
    refetchInterval: 10_000,
  });
  const items = useMemo<RangeFlowItem[]>(() => {
    const m: RangeFlowItem[] = (minted.data ?? []).map((r) => ({
      kind: "mint",
      ts: r.checkpoint_timestamp_ms,
      oracleId: r.oracle_id,
      lower: r.lower_strike,
      higher: r.higher_strike,
      qty: r.quantity,
      amount: r.cost,
      actor: r.trader,
      digest: r.digest,
    }));
    const r: RangeFlowItem[] = (redeemed.data ?? []).map((x) => ({
      kind: "redeem",
      ts: x.checkpoint_timestamp_ms,
      oracleId: x.oracle_id,
      lower: x.lower_strike,
      higher: x.higher_strike,
      qty: x.quantity,
      amount: x.payout,
      actor: x.trader,
      digest: x.digest,
      settled: x.is_settled,
    }));
    return [...m, ...r].sort((a, b) => b.ts - a.ts).slice(0, limit);
  }, [minted.data, redeemed.data, limit]);
  return {
    items,
    mints: minted.data ?? [],
    redeems: redeemed.data ?? [],
    isLoading: minted.isLoading || redeemed.isLoading,
    isError: minted.isError || redeemed.isError,
  };
}
