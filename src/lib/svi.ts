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
