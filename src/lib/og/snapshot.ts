/**
 * Server-side desk snapshot for the social cards. Reads the live indexer (the
 * plain `indexer` client is documented as server-safe) and computes the same
 * readouts the desk shows, with the same pure functions. Every step degrades on
 * its own: if the indexer is unreachable at build or revalidate time the card
 * still renders from `FALLBACK` and reports `live: false` so it never claims a
 * read it does not have. The result is memoized per process so a build does not
 * refetch for every route.
 */

import { indexer } from "@/lib/indexer/client";
import type { OraclePrice } from "@/lib/indexer/types";
import { fromUnits, priceToFloat } from "@/lib/format";
import { DUSDC_DECIMALS, PREDICT_ID } from "@/lib/sui/constants";
import {
  checkButterfly,
  decodeSvi,
  digitalProb,
  impliedVol,
  totalVariance,
  yearsToExpiry,
  type SviParams,
} from "@/lib/svi";

export interface TapeRow {
  ts: number;
  isUp: boolean;
  strike: number;
  premium: number;
}

export interface OgSnapshot {
  // market
  spot: number | null;
  forward: number | null;
  atmIV: number | null; // fraction
  atmVar: number | null;
  vol24h: number | null; // fraction
  arbFree: boolean | null;
  tenors: number | null;
  expiryMs: number | null;
  svi: SviParams | null;
  T: number | null;
  // vault
  plp: number | null; // USD
  utilization: number | null; // fraction
  maxPayoutUtil: number | null; // fraction
  sharePrice: number | null;
  perf: number[];
  // flow
  pctUp: number | null;
  mintCount: number | null;
  mintNotional: number | null; // USD premium minted (recent window)
  edgeBps: number | null; // mean (paid - fair) over front-oracle fills, bps
  winRate: number | null;
  settledCount: number | null;
  tape: TapeRow[];
  // managers
  deskCount: number | null;
  // chain
  lagSeconds: number | null;
  checkpoint: number | null;
  live: boolean;
}

const FALLBACK: OgSnapshot = {
  spot: 100_000,
  forward: 100_000,
  atmIV: 0.55,
  atmVar: null,
  vol24h: 0.6,
  arbFree: true,
  tenors: 8,
  expiryMs: null,
  svi: null,
  T: null,
  plp: 1_000_000,
  utilization: 0.0,
  maxPayoutUtil: 0.0,
  sharePrice: 1,
  perf: [],
  pctUp: null,
  mintCount: null,
  mintNotional: null,
  edgeBps: null,
  winRate: null,
  settledCount: null,
  tape: [],
  deskCount: null,
  lagSeconds: null,
  checkpoint: null,
  live: false,
};

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function realizedVolFromHistory(points: OraclePrice[]): number | null {
  if (points.length < 3) return null;
  const sorted = [...points].sort(
    (a, b) => a.checkpoint_timestamp_ms - b.checkpoint_timestamp_ms,
  );
  const rets: number[] = [];
  const dts: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = priceToFloat(sorted[i - 1].spot);
    const cur = priceToFloat(sorted[i].spot);
    const dt =
      sorted[i].checkpoint_timestamp_ms - sorted[i - 1].checkpoint_timestamp_ms;
    if (prev > 0 && cur > 0 && dt > 0) {
      rets.push(Math.log(cur / prev));
      dts.push(dt);
    }
  }
  if (rets.length < 2) return null;
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance =
    rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
  const meanDt = dts.reduce((s, d) => s + d, 0) / dts.length;
  if (!(meanDt > 0)) return null;
  const rv = Math.sqrt(variance * (MS_PER_YEAR / meanDt));
  return Number.isFinite(rv) && rv > 0 && rv < 5 ? rv : null;
}

async function loadFresh(): Promise<OgSnapshot> {
  const snap: OgSnapshot = { ...FALLBACK, perf: [], tape: [] };
  let frontId: string | null = null;

  try {
    const oracles = await indexer.oracles();
    const active = oracles
      .filter((o) => o.status === "active")
      .sort((a, b) => a.expiry - b.expiry);
    snap.tenors = active.length || null;
    const front = active[0];
    if (front) {
      frontId = front.oracle_id;
      snap.expiryMs = front.expiry;
      const state = await indexer.oracleState(front.oracle_id);
      if (state.latest_price?.spot) snap.spot = priceToFloat(state.latest_price.spot);
      if (state.latest_price?.forward)
        snap.forward = priceToFloat(state.latest_price.forward);
      if (state.latest_svi) {
        const params = decodeSvi(state.latest_svi);
        const T = yearsToExpiry(front.expiry, state.latest_svi.checkpoint_timestamp_ms);
        snap.svi = params;
        snap.T = T > 0 ? T : null;
        const iv = T > 0 ? impliedVol(0, params, T) : 0;
        if (iv > 0) snap.atmIV = iv;
        const w = totalVariance(0, params);
        if (Number.isFinite(w)) snap.atmVar = w;
        snap.arbFree = checkButterfly(params).butterflyFree;
      }
      try {
        const rv = realizedVolFromHistory(await indexer.spotHistory(front.oracle_id, 200));
        if (rv != null) snap.vol24h = rv;
      } catch {}
      snap.live = snap.spot != null && snap.atmIV != null;
    }
  } catch {}

  try {
    const vault = await indexer.vaultSummary(PREDICT_ID);
    if (Number.isFinite(vault.vault_value))
      snap.plp = fromUnits(vault.vault_value, DUSDC_DECIMALS);
    if (Number.isFinite(vault.utilization)) snap.utilization = vault.utilization;
    if (Number.isFinite(vault.max_payout_utilization))
      snap.maxPayoutUtil = vault.max_payout_utilization;
    // plp_share_price is already a float ratio (e.g. 1.0028), not 1e6-scaled.
    if (Number.isFinite(vault.plp_share_price)) snap.sharePrice = vault.plp_share_price;
  } catch {}

  try {
    const perf = await indexer.vaultPerformance(PREDICT_ID, "ALL");
    snap.perf = [...perf.points]
      .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
      .map((p) => fromUnits(p.share_price, DUSDC_DECIMALS))
      .filter((v) => Number.isFinite(v) && v > 0)
      .slice(-40);
  } catch {}

  try {
    const mints = await indexer.positionsMinted(150);
    if (mints.length) {
      snap.pctUp = mints.filter((m) => m.is_up).length / mints.length;
      snap.mintCount = mints.length;
      snap.mintNotional = mints.reduce((s, m) => s + fromUnits(m.cost, DUSDC_DECIMALS), 0);
      snap.tape = [...mints]
        .sort((a, b) => b.checkpoint_timestamp_ms - a.checkpoint_timestamp_ms)
        .slice(0, 4)
        .map((m) => ({
          ts: m.checkpoint_timestamp_ms,
          isUp: m.is_up,
          strike: priceToFloat(m.strike),
          premium: fromUnits(m.cost, DUSDC_DECIMALS),
        }));
      // Realized edge over fills on the front oracle (paid vs model-fair N(d2)).
      if (frontId && snap.svi && snap.forward) {
        let sum = 0;
        let n = 0;
        for (const m of mints) {
          if (m.oracle_id !== frontId) continue;
          const k = Math.log(priceToFloat(m.strike) / snap.forward);
          const fair = digitalProb(k, snap.svi, m.is_up);
          const paid = m.ask_price / 1e9;
          if (paid > 0 && paid < 1 && Number.isFinite(fair)) {
            sum += paid - fair;
            n++;
          }
        }
        if (n) snap.edgeBps = (sum / n) * 10000;
      }
    }
  } catch {}

  try {
    const redeems = await indexer.positionsRedeemed(200);
    const settled = redeems.filter((r) => r.is_settled);
    if (settled.length) {
      snap.winRate = settled.filter((r) => r.payout > 0).length / settled.length;
      snap.settledCount = settled.length;
    }
  } catch {}

  try {
    const managers = await indexer.managers();
    snap.deskCount = managers.length || null;
  } catch {}

  try {
    const status = await indexer.status();
    if (Number.isFinite(status.max_time_lag_seconds))
      snap.lagSeconds = Math.max(0, Math.round(status.max_time_lag_seconds));
    if (Number.isFinite(status.latest_onchain_checkpoint))
      snap.checkpoint = status.latest_onchain_checkpoint;
  } catch {}

  return snap;
}

// Short-TTL memo: dedupes the burst of card renders during one build, but
// expires fast so each hourly ISR regeneration fetches a fresh snapshot rather
// than reusing a stale one for the life of the server process.
const MEMO_TTL_MS = 30_000;
let cached: { at: number; promise: Promise<OgSnapshot> } | null = null;

export function loadOgSnapshot(): Promise<OgSnapshot> {
  const now = Date.now();
  if (cached && now - cached.at < MEMO_TTL_MS) return cached.promise;
  cached = { at: now, promise: loadFresh() };
  return cached.promise;
}
