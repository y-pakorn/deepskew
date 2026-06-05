/**
 * Derived desk analytics — pure functions over indexer flow + the live SVI
 * smile. The keystone is that an SVI smile IS a continuum of binary prices: the
 * model-fair value of an UP binary at strike K is Φ(d₂) (see `digitalUpProb`).
 * Everything here marks on-chain binaries against that and aggregates exposure.
 *
 * Units: quantities/cost/payout are raw 1e6 (dUSDC); strikes/forward/prices are
 * raw 1e9; a "fair"/"paid" value is a probability in [0,1]. Functions keep raw
 * 1e6 for money so callers can `fromUnits(…, DUSDC_DECIMALS)` at the edge.
 */

import type { PositionMinted, PositionRedeemed } from "./indexer/types";
import { digitalUpProb, type SviParams } from "./svi";

/** Everything needed to mark one oracle's binaries to fair value. */
export interface OracleMark {
  oracleId: string;
  params: SviParams | null;
  forward: number; // 1e9
  spot: number; // 1e9
  T: number; // years
  atmIV: number; // fraction
  status: string; // active | settled | created
  settlementPrice: number | null; // 1e9
  expiry: number; // ms
  /** Newest of the latest SVI / price checkpoint timestamps (feed freshness). */
  lastUpdateMs: number;
}

export type MarkMap = Map<string, OracleMark>;

/** Fair value of an UP binary (finishes above strike) under a mark. NaN if the
 *  mark can't price it (no params / no forward, and not yet settled). */
export function fairUp(strike: number, m: OracleMark | undefined): number {
  if (!m) return NaN;
  if (m.status === "settled" && m.settlementPrice != null) {
    return m.settlementPrice > strike ? 1 : 0;
  }
  if (!m.params || !(m.forward > 0)) return NaN;
  return digitalUpProb(Math.log(strike / m.forward), m.params);
}

/** Fair value on the chosen side. */
export function fairSide(
  strike: number,
  isUp: boolean,
  m: OracleMark | undefined,
): number {
  const up = fairUp(strike, m);
  return isUp ? up : 1 - up;
}

/** True iff the mark can price live (unsettled) binaries right now. */
export function isLiveMark(m: OracleMark | undefined): m is OracleMark {
  return (
    !!m &&
    m.status === "active" &&
    !!m.params &&
    m.forward > 0 &&
    m.T > 0 &&
    m.expiry > Date.now()
  );
}

// ─── Digital edge: model-fair Φ(d₂) vs the price actually paid ───────────────

export interface EdgeRow {
  digest: string;
  ts: number;
  oracleId: string;
  trader: string;
  isUp: boolean;
  strike: number; // 1e9
  moneyness: number; // strike/forward − 1
  qty: number; // contracts (units)
  paid: number; // probability paid by the taker (the ask)
  fair: number; // model-fair probability
  /** Signed vault edge per contract = paid − fair (>0 ⇒ vault overcharged). */
  edge: number;
  edgeBps: number;
  dollarEdge: number; // raw 1e6
}

export interface EdgeSummary {
  rows: EdgeRow[];
  /** Premium-weighted mean signed edge (bps), vault side. */
  meanEdgeBps: number;
  /** Cumulative signed $ edge over the window — realized vol-risk-premium (1e6). */
  cumDollar: number;
  /** Share of fills where the taker overpaid (vault edge > 0). */
  overpayRate: number;
  count: number;
}

/** Mark each live mint against the smile. Skips fills on oracles we can't price
 *  live (settled / no SVI), so the edge always reflects a quotable surface. */
export function digitalEdge(
  mints: PositionMinted[],
  marks: MarkMap,
): EdgeSummary {
  const rows: EdgeRow[] = [];
  let wEdge = 0;
  let wSum = 0;
  let cumDollar = 0;
  let overpay = 0;
  for (const mnt of mints) {
    const m = marks.get(mnt.oracle_id);
    if (!isLiveMark(m)) continue;
    const fair = fairSide(mnt.strike, mnt.is_up, m);
    if (!Number.isFinite(fair)) continue;
    const paid =
      mnt.ask_price > 0
        ? mnt.ask_price / 1e9
        : mnt.quantity > 0
          ? mnt.cost / mnt.quantity
          : NaN;
    if (!Number.isFinite(paid)) continue;
    const qty = mnt.quantity / 1e6;
    const edge = paid - fair; // vault side
    const dollarEdge = edge * qty * 1e6; // back to raw 1e6
    const premium = paid * qty;
    rows.push({
      digest: mnt.digest,
      ts: mnt.checkpoint_timestamp_ms,
      oracleId: mnt.oracle_id,
      trader: mnt.trader,
      isUp: mnt.is_up,
      strike: mnt.strike,
      moneyness: mnt.strike / m.forward - 1,
      qty,
      paid,
      fair,
      edge,
      edgeBps: edge * 1e4,
      dollarEdge,
    });
    wEdge += edge * 1e4 * premium;
    wSum += premium;
    cumDollar += dollarEdge;
    if (edge > 0) overpay += 1;
  }
  rows.sort((a, b) => b.ts - a.ts);
  return {
    rows,
    meanEdgeBps: wSum > 0 ? wEdge / wSum : 0,
    cumDollar,
    overpayRate: rows.length ? overpay / rows.length : 0,
    count: rows.length,
  };
}

// ─── Open book reconstruction + per-oracle exposure ─────────────────────────

interface Leg {
  strike: number;
  isUp: boolean;
  net: number; // open quantity, raw 1e6 (minted − redeemed)
}

/** Net open quantity per (oracle, strike, side) from minted − redeemed flow. */
export function buildOpenBook(
  mints: PositionMinted[],
  redeems: PositionRedeemed[],
): Map<string, Leg[]> {
  const byOracle = new Map<string, Map<string, number>>();
  const bump = (oracleId: string, strike: number, isUp: boolean, q: number) => {
    let legs = byOracle.get(oracleId);
    if (!legs) byOracle.set(oracleId, (legs = new Map()));
    const key = `${strike}:${isUp ? 1 : 0}`;
    legs.set(key, (legs.get(key) ?? 0) + q);
  };
  for (const m of mints) bump(m.oracle_id, m.strike, m.is_up, m.quantity);
  for (const r of redeems) bump(r.oracle_id, r.strike, r.is_up, -r.quantity);
  const out = new Map<string, Leg[]>();
  for (const [oracleId, legs] of byOracle) {
    const arr: Leg[] = [];
    for (const [key, net] of legs) {
      if (net <= 0) continue; // closed / over-redeemed → no open exposure
      const [strikeStr, upStr] = key.split(":");
      arr.push({ strike: Number(strikeStr), isUp: upStr === "1", net });
    }
    if (arr.length) out.set(oracleId, arr);
  }
  return out;
}

export interface OracleExposure {
  oracleId: string;
  expiry: number;
  T: number;
  status: string;
  liability: number; // vault's marked liability, raw 1e6
  maxPayout: number; // worst-case payout, raw 1e6
  netDir: number; // signed marked directional inventory, raw 1e6 (+up −dn)
  share: number; // share of total liability
}

export interface Attribution {
  rows: OracleExposure[];
  totalLiability: number; // raw 1e6
  hhi: number; // Σ share²  (0..1)
  topShare: number; // top-1 expiry share
  top3Share: number;
  priced: number; // # oracles we could price
}

/** Decompose the open book into per-oracle marked liability + concentration. */
export function perOracleAttribution(
  book: Map<string, Leg[]>,
  marks: MarkMap,
): Attribution {
  const rows: OracleExposure[] = [];
  for (const [oracleId, legs] of book) {
    const m = marks.get(oracleId);
    if (!isLiveMark(m)) continue;
    let liability = 0;
    let maxPayout = 0;
    let netDir = 0;
    for (const leg of legs) {
      const f = fairSide(leg.strike, leg.isUp, m);
      if (!Number.isFinite(f)) continue;
      liability += leg.net * f;
      maxPayout += leg.net;
      netDir += (leg.isUp ? 1 : -1) * leg.net * f;
    }
    rows.push({
      oracleId,
      expiry: m.expiry,
      T: m.T,
      status: m.status,
      liability,
      maxPayout,
      netDir,
      share: 0,
    });
  }
  const total = rows.reduce((s, r) => s + r.liability, 0);
  for (const r of rows) r.share = total > 0 ? r.liability / total : 0;
  rows.sort((a, b) => b.liability - a.liability);
  const hhi = rows.reduce((s, r) => s + r.share * r.share, 0);
  return {
    rows,
    totalLiability: total,
    hhi,
    topShare: rows[0]?.share ?? 0,
    top3Share: rows.slice(0, 3).reduce((s, r) => s + r.share, 0),
    priced: rows.length,
  };
}

// ─── ±σ book-wide scenario engine ───────────────────────────────────────────

export interface ScenarioPoint {
  n: number; // σ multiple (signed; − = down shock)
  moveFrac: number; // applied move on the front-tenor scale
  liability: number; // repriced marked liability, raw 1e6
  deltaLiability: number; // liability(n) − liability(0), raw 1e6
  vaultValue: number; // stressed vault value, raw 1e6
  buffer: number; // stressed vault value / base vault value
}

/**
 * Reprice the whole open book at a forward shocked by n·σ_T (per oracle, using
 * its own ATM σ and √T), holding the SVI smile shape fixed. The stressed vault
 * value applies the change in marked liability to the live vault value, so it's
 * anchored to the protocol's own number even though the book is reconstructed.
 */
export function scenarioCurve(
  book: Map<string, Leg[]>,
  marks: MarkMap,
  vaultValue: number, // raw 1e6 (the protocol's vault_value)
  ns: number[],
  scale = 1, // anchor the reconstructed Δliability to the reported book size
): ScenarioPoint[] {
  // Pre-resolve priceable legs once.
  const priced: { legs: Leg[]; m: OracleMark }[] = [];
  for (const [oracleId, legs] of book) {
    const m = marks.get(oracleId);
    if (isLiveMark(m)) priced.push({ legs, m });
  }
  const liabilityAt = (n: number): number => {
    let total = 0;
    for (const { legs, m } of priced) {
      const sigmaT = m.atmIV * Math.sqrt(m.T);
      const fwd = m.forward * Math.exp(n * sigmaT);
      for (const leg of legs) {
        if (!m.params) continue;
        const k = Math.log(leg.strike / fwd);
        const up = digitalUpProb(k, m.params);
        const f = leg.isUp ? up : 1 - up;
        total += leg.net * f;
      }
    }
    return total;
  };
  const base = liabilityAt(0);
  // Use the nearest-tenor ATM σ to label the move axis.
  const front = priced.reduce<OracleMark | null>(
    (acc, p) => (!acc || p.m.T < acc.T ? p.m : acc),
    null,
  );
  return ns.map((n) => {
    const liability = liabilityAt(n);
    const delta = (liability - base) * scale;
    const vv = vaultValue - delta;
    return {
      n,
      moveFrac: front ? Math.exp(n * front.atmIV * Math.sqrt(front.T)) - 1 : 0,
      liability,
      deltaLiability: delta,
      vaultValue: vv,
      buffer: vaultValue > 0 ? vv / vaultValue : 0,
    };
  });
}

/** Smallest |n| at which the stressed vault value crosses zero (LP wipeout),
 *  scanning each direction; null if it survives the whole range. */
export function breachSigma(
  book: Map<string, Leg[]>,
  marks: MarkMap,
  vaultValue: number,
  maxN = 5,
  step = 0.1,
): { down: number | null; up: number | null } {
  const scan = (dir: 1 | -1): number | null => {
    for (let n = step; n <= maxN + 1e-9; n += step) {
      const [pt] = scenarioCurve(book, marks, vaultValue, [dir * n]);
      if (pt.vaultValue <= 0) return n;
    }
    return null;
  };
  return { down: scan(-1), up: scan(1) };
}
