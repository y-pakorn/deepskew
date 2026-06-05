import { SVI_FIXED_POINT } from "@/lib/sui/constants";
import type { SviLatest } from "@/lib/indexer/types";

/**
 * Raw-SVI volatility model.
 *   w(k) = a + b · ( ρ·(k − m) + sqrt( (k − m)² + σ² ) )
 *   IV(k) = sqrt( w(k) / T )
 * where k = ln(K / F) is log-moneyness and T is time-to-expiry in years.
 * Ref: Gatheral & Jacquier, "Arbitrage-free SVI volatility surfaces" (2014).
 */
export interface SviParams {
  a: number;
  b: number;
  rho: number;
  m: number;
  sigma: number;
}

/** Decode raw indexer fixed-point integers into float SVI params. */
export function decodeSvi(raw: SviLatest, scale = SVI_FIXED_POINT): SviParams {
  return {
    a: raw.a / scale,
    b: raw.b / scale,
    rho: (raw.rho / scale) * (raw.rho_negative ? -1 : 1),
    m: (raw.m / scale) * (raw.m_negative ? -1 : 1),
    sigma: raw.sigma / scale,
  };
}

/** Total variance w(k). */
export function totalVariance(k: number, p: SviParams): number {
  const km = k - p.m;
  return p.a + p.b * (p.rho * km + Math.hypot(km, p.sigma));
}

/** Implied volatility from total variance and time-to-expiry T (years). */
export function impliedVol(k: number, p: SviParams, T: number): number {
  const w = totalVariance(k, p);
  return w > 0 && T > 0 ? Math.sqrt(w / T) : 0;
}

/** First derivative w'(k) (analytic). */
export function dTotalVariance(k: number, p: SviParams): number {
  const km = k - p.m;
  return p.b * (p.rho + km / Math.hypot(km, p.sigma));
}

/** Second derivative w''(k) (analytic). */
export function d2TotalVariance(k: number, p: SviParams): number {
  const km = k - p.m;
  const root = Math.hypot(km, p.sigma);
  return (p.b * p.sigma * p.sigma) / (root * root * root);
}

/** Durrleman's function g(k); butterfly-arbitrage-free iff g(k) ≥ 0 ∀k. */
export function durrleman(k: number, p: SviParams): number {
  const w = totalVariance(k, p);
  if (w <= 0) return -Infinity;
  const wp = dTotalVariance(k, p);
  const wpp = d2TotalVariance(k, p);
  const term1 = (1 - (k * wp) / (2 * w)) ** 2;
  const term2 = ((wp * wp) / 4) * (1 / w + 1 / 4);
  return term1 - term2 + wpp / 2;
}

export interface ButterflyCheck {
  butterflyFree: boolean;
  minG: number;
  violations: number[];
}

/** Sample Durrleman's condition across a log-moneyness grid. */
export function checkButterfly(
  p: SviParams,
  opts: { kMin?: number; kMax?: number; steps?: number } = {},
): ButterflyCheck {
  const { kMin = -1.5, kMax = 1.5, steps = 200 } = opts;
  let minG = Infinity;
  const violations: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const k = kMin + ((kMax - kMin) * i) / steps;
    const g = durrleman(k, p);
    if (g < minG) minG = g;
    if (g < 0) violations.push(k);
  }
  return { butterflyFree: violations.length === 0, minG, violations };
}

export interface CalendarCheck {
  calendarFree: boolean;
  crossings: number;
}

/**
 * Calendar-arbitrage-free iff total variance is non-decreasing in T at fixed k.
 * `slices` are (T, params) per expiry; sorted ascending internally.
 */
export function checkCalendar(
  slices: { T: number; p: SviParams }[],
  opts: { kMin?: number; kMax?: number; steps?: number } = {},
): CalendarCheck {
  const { kMin = -1.5, kMax = 1.5, steps = 100 } = opts;
  const sorted = [...slices].sort((a, b) => a.T - b.T);
  let crossings = 0;
  for (let s = 1; s < sorted.length; s++) {
    for (let i = 0; i <= steps; i++) {
      const k = kMin + ((kMax - kMin) * i) / steps;
      if (
        totalVariance(k, sorted[s].p) <
        totalVariance(k, sorted[s - 1].p) - 1e-12
      ) {
        crossings++;
      }
    }
  }
  return { calendarFree: crossings === 0, crossings };
}

/** Sample an IV smile across a log-moneyness grid (for chart cross-section). */
export function smile(
  p: SviParams,
  T: number,
  opts: { kMin?: number; kMax?: number; steps?: number } = {},
): { k: number; iv: number }[] {
  const { kMin = -1.0, kMax = 1.0, steps = 80 } = opts;
  const out: { k: number; iv: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const k = kMin + ((kMax - kMin) * i) / steps;
    out.push({ k, iv: impliedVol(k, p, T) });
  }
  return out;
}

/** Time-to-expiry in years from an expiry timestamp (ms) and now (ms). */
export function yearsToExpiry(expiryMs: number, nowMs: number): number {
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
  return Math.max(0, (expiryMs - nowMs) / MS_PER_YEAR);
}

// ─── Gaussian helpers ───────────────────────────────────────────────────────

/** Standard normal CDF Φ(x) — Abramowitz & Stegun 7.1.26 (|error| < 7.5e-8). */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.319381530 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - prob : prob;
}

/** Standard normal PDF φ(x). */
export function normalPdf(x: number): number {
  return 0.3989422804014327 * Math.exp((-x * x) / 2);
}

/** Inverse standard normal CDF Φ⁻¹(p) — Acklam's rational approximation. */
export function normalInv(p: number): number {
  if (!(p > 0)) return -Infinity;
  if (!(p < 1)) return Infinity;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

// ─── Binary (digital) pricing from the smile ────────────────────────────────

/**
 * Risk-neutral probability the underlying finishes **above** strike K, i.e. the
 * fair value of an UP binary (paying 1 at K, 0 below). `k = ln(K/F)`.
 *   d₂ = −k/√w − √w/2 ,   P(S_T > K) = Φ(d₂)
 * where w = σ²T is total variance — so this is a pure function of (k, params),
 * no separate T needed. This is the model-fair price every on-chain binary mint
 * is scored against.
 */
export function digitalUpProb(k: number, p: SviParams): number {
  const w = totalVariance(k, p);
  if (!(w > 0)) return k < 0 ? 1 : 0;
  const s = Math.sqrt(w);
  return normalCdf(-k / s - s / 2);
}

/** Fair value of a binary on the chosen side (up = finishes above K). */
export function digitalProb(k: number, p: SviParams, isUp: boolean): number {
  const up = digitalUpProb(k, p);
  return isUp ? up : 1 - up;
}

/** Black-Scholes-style call delta N(d₁) under the smile's local variance. */
export function callDelta(k: number, p: SviParams): number {
  const w = totalVariance(k, p);
  if (!(w > 0)) return k < 0 ? 1 : 0;
  const s = Math.sqrt(w);
  return normalCdf(-k / s + s / 2);
}

/**
 * Solve for the log-moneyness k whose call delta equals `target` (0..1), by
 * bisection over k∈[−2,2]. callDelta is monotone-decreasing in k for sane SVI,
 * so the root is unique; returns null if the target isn't bracketed.
 */
export function strikeForCallDelta(
  p: SviParams,
  target: number,
): number | null {
  let lo = -2;
  let hi = 2;
  const fLo = callDelta(lo, p) - target;
  const fHi = callDelta(hi, p) - target;
  if (fLo === 0) return lo;
  if (fHi === 0) return hi;
  if (fLo * fHi > 0) return null; // not bracketed
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const fMid = callDelta(mid, p) - target;
    if (Math.abs(fMid) < 1e-9) return mid;
    if (fLo * fMid <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface SkewMetrics {
  /** 25-delta risk reversal in vol points: IV(25Δ call) − IV(25Δ put). */
  rr25: number;
  /** 25-delta butterfly in vol points: ½(IV_c+IV_p) − IV_atm. */
  bf25: number;
  atmIV: number;
}

/**
 * 25-delta risk-reversal and butterfly (in vol points, ×100). Solves the 25Δ
 * call/put strikes off the smile, then differences their IVs. Returns null if
 * either delta strike can't be solved or T≤0.
 */
export function skewMetrics(p: SviParams, T: number): SkewMetrics | null {
  if (!(T > 0)) return null;
  const kCall = strikeForCallDelta(p, 0.25); // 25Δ call
  const kPut = strikeForCallDelta(p, 0.75); // 25Δ put ≡ 75Δ call
  if (kCall == null || kPut == null) return null;
  const ivC = impliedVol(kCall, p, T) * 100;
  const ivP = impliedVol(kPut, p, T) * 100;
  const atm = impliedVol(0, p, T) * 100;
  return { rr25: ivC - ivP, bf25: (ivC + ivP) / 2 - atm, atmIV: atm };
}

/**
 * ATM forward (between-expiry) volatility from two tenors' ATM total variance.
 *   σ_fwd = √( (w₂ − w₁) / (T₂ − T₁) )
 * Returns null when the variance isn't increasing (calendar-arb in the window).
 */
export function forwardVol(
  T1: number,
  w1: number,
  T2: number,
  w2: number,
): number | null {
  const dT = T2 - T1;
  const dW = w2 - w1;
  if (dT <= 0 || dW < 0) return null;
  return Math.sqrt(dW / dT);
}

/** 1σ implied move (fraction of forward) over the expiry: σ_ATM·√T. */
export function impliedMove(atmIV: number, T: number): number {
  return atmIV * Math.sqrt(Math.max(0, T));
}

// ─── Risk-neutral density (Breeden–Litzenberger via Gatheral) ────────────────

export interface RndPoint {
  k: number;
  /** Density of the log-return, normalised to integrate to 1 over the grid. */
  q: number;
}

/**
 * Risk-neutral density of x = ln(S_T/F) implied by one SVI slice (Gatheral,
 * "The Volatility Surface"):
 *   q(k) = g(k) / √(2π·w(k)) · exp(−d₋(k)²/2),  d₋ = −k/√w − √w/2
 * where g(k) is Durrleman's function — so g(k) ≥ 0 (the butterfly condition) is
 * exactly the density-non-negativity condition. Sampled across the k-grid and
 * normalised numerically to integrate to 1 (negatives clamped to 0).
 */
export function riskNeutralDensity(
  p: SviParams,
  opts: { kMin?: number; kMax?: number; steps?: number } = {},
): RndPoint[] {
  const { kMin = -1.0, kMax = 1.0, steps = 160 } = opts;
  const raw: RndPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const k = kMin + ((kMax - kMin) * i) / steps;
    const w = totalVariance(k, p);
    let q = 0;
    if (w > 0) {
      const s = Math.sqrt(w);
      const dm = -k / s - s / 2;
      const g = Math.max(0, durrleman(k, p));
      q = (g / Math.sqrt(2 * Math.PI * w)) * Math.exp((-dm * dm) / 2);
    }
    raw.push({ k, q });
  }
  // Trapezoidal area → normalise to a proper density.
  let area = 0;
  for (let i = 1; i < raw.length; i++) {
    area += ((raw[i].q + raw[i - 1].q) / 2) * (raw[i].k - raw[i - 1].k);
  }
  if (area > 0) for (const pt of raw) pt.q /= area;
  return raw;
}

export interface RndStats {
  /** Log-moneyness of the modal (most-likely) outcome. */
  modeK: number;
  /** Modal outcome as a move vs forward: e^modeK − 1. */
  modeMove: number;
  /** Risk-neutral P(S_T > F) — the market's priced up-probability. */
  pUp: number;
  /** 10th / 90th percentile of the move (e^k − 1) — the priced range. */
  q10: number;
  q90: number;
}

/** Mode, up-probability and 10/90 quantiles of an RND sample. */
export function rndStats(points: RndPoint[]): RndStats | null {
  if (points.length < 3) return null;
  let modeK = points[0].k;
  let modeQ = points[0].q;
  let pUp = 0;
  let cum = 0;
  const cdf: { k: number; c: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i].q > modeQ) {
      modeQ = points[i].q;
      modeK = points[i].k;
    }
    if (i > 0) {
      const dk = points[i].k - points[i - 1].k;
      const seg = ((points[i].q + points[i - 1].q) / 2) * dk;
      cum += seg;
      if (points[i].k > 0) pUp += seg;
    }
    cdf.push({ k: points[i].k, c: cum });
  }
  const quant = (target: number): number => {
    for (let i = 1; i < cdf.length; i++) {
      if (cdf[i].c >= target) {
        const t = (target - cdf[i - 1].c) / (cdf[i].c - cdf[i - 1].c || 1);
        const k = cdf[i - 1].k + t * (cdf[i].k - cdf[i - 1].k);
        return Math.exp(k) - 1;
      }
    }
    return Math.exp(cdf[cdf.length - 1].k) - 1;
  };
  return {
    modeK,
    modeMove: Math.exp(modeK) - 1,
    pUp: Math.min(1, Math.max(0, pUp)),
    q10: quant(0.1),
    q90: quant(0.9),
  };
}
