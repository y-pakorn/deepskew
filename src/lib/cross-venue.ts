/**
 * Cross-venue reference data for the vol-arb panels. The only out-of-protocol
 * data the terminal touches — Deribit's BTC DVOL index (implied vol) and Binance
 * BTCUSDT klines (for realized vol). Both send permissive CORS, so they're
 * called straight from the browser like the indexer.
 */

import { useQuery } from "@tanstack/react-query";

const DERIBIT = "https://www.deribit.com/api/v2/public";
const BINANCE = "https://api.binance.com/api/v3";
const DAY_MS = 24 * 3600 * 1000;
const PERIODS_PER_YEAR = 24 * 365.25; // hourly samples

export interface VolPoint {
  ts: number;
  value: number;
}

/** Deribit BTC DVOL index, hourly, last 7 days (annualised vol %). */
async function fetchDvol(): Promise<VolPoint[]> {
  const end = Date.now();
  const start = end - 7 * DAY_MS;
  const url = `${DERIBIT}/get_volatility_index_data?currency=BTC&start_timestamp=${start}&end_timestamp=${end}&resolution=3600`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Deribit ${res.status}`);
  const json = (await res.json()) as {
    result?: { data?: number[][] };
  };
  const data = json.result?.data ?? [];
  // Each row: [timestamp_ms, open, high, low, close].
  return data
    .map((d) => ({ ts: d[0], value: d[4] }))
    .filter((p) => Number.isFinite(p.value));
}

/** Binance BTCUSDT hourly closes, last 7 days. */
async function fetchBinanceCloses(): Promise<VolPoint[]> {
  const url = `${BINANCE}/klines?symbol=BTCUSDT&interval=1h&limit=168`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const json = (await res.json()) as unknown[][];
  return json.map((k) => ({ ts: Number(k[0]), value: Number(k[4]) }));
}

/** Annualised realized vol from a series of closes (hourly). */
export function realizedVol(closes: number[]): number | null {
  if (closes.length < 3) return null;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  if (rets.length < 2) return null;
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance =
    rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(PERIODS_PER_YEAR);
}

/** Rolling realized-vol series (% points) over a trailing window of hours. */
export function rollingRealizedVol(points: VolPoint[], window = 24): VolPoint[] {
  const out: VolPoint[] = [];
  for (let i = window; i < points.length; i++) {
    const rv = realizedVol(points.slice(i - window, i + 1).map((p) => p.value));
    if (rv != null) out.push({ ts: points[i].ts, value: rv * 100 });
  }
  return out;
}

export function useDvol() {
  return useQuery({
    queryKey: ["xvenue", "dvol"],
    queryFn: fetchDvol,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useBinanceCloses() {
  return useQuery({
    queryKey: ["xvenue", "binance"],
    queryFn: fetchBinanceCloses,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}
