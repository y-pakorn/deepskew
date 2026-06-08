/**
 * DeepBook v3 (spot CLOB) + deepbook_margin indexer — the cross-protocol legs
 * that put Predict in its DeepBook context. Both products are served by the same
 * testnet indexer host with permissive CORS, so they're called straight from the
 * browser like the Predict indexer. Used by the Composability panel to read the
 * on-chain venue Predict's BTC settles against (spot) and the dUSDC borrow rate
 * that funds a leveraged-PLP loop (margin).
 *
 * Docs: deepbookv3-indexer, deepbook-margin-indexer.
 */
import { useQuery } from "@tanstack/react-query";

const DEEPBOOK_INDEXER = "https://deepbook-indexer.testnet.mystenlabs.com";

async function dbGet<T>(path: string): Promise<T> {
  const res = await fetch(`${DEEPBOOK_INDEXER}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`DeepBook indexer ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

/** GET /summary — one row per spot trading pair. Numeric fields may arrive as
 *  strings, so coerce with Number() at the call site. */
export interface DeepBookSummary {
  trading_pairs: string;
  base_currency: string;
  quote_currency: string;
  last_price: number;
  base_volume: number;
  quote_volume: number;
  highest_bid: number;
  lowest_ask: number;
  price_change_percent_24h: number;
}

/** GET /margin_pool_created — interest curve params are 1e9-scaled fractions. */
export interface InterestConfig {
  base_rate: number;
  base_slope: number;
  optimal_utilization: number;
  excess_slope: number;
}
export interface MarginPoolConfig {
  supply_cap: number;
  max_utilization_rate: number;
  protocol_spread: number;
  min_borrow: number;
}
export interface MarginPoolCreated {
  margin_pool_id: string;
  asset_type: string;
  config_json: {
    interest_config: InterestConfig;
    margin_pool_config: MarginPoolConfig;
  };
}

/** Spot summaries for every DeepBook v3 pair. */
export function useDeepBookSummary() {
  return useQuery({
    queryKey: ["deepbook", "summary"],
    queryFn: () => dbGet<DeepBookSummary[]>("/summary"),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });
}

/** Every deepbook_margin pool with its on-chain interest + risk config. */
export function useMarginPools() {
  return useQuery({
    queryKey: ["deepbook", "margin", "pools"],
    queryFn: () => dbGet<MarginPoolCreated[]>("/margin_pool_created"),
    refetchInterval: 120_000,
    staleTime: 60_000,
    retry: 1,
  });
}

const SCALE = 1e9;

/** Two-slope kinked borrow APR (as a fraction) at utilization `u` (0..1): cheap
 *  below the optimal-utilization kink, punitive above it. */
export function borrowApr(cfg: InterestConfig, u: number): number {
  const base = cfg.base_rate / SCALE;
  const slope = cfg.base_slope / SCALE;
  const opt = cfg.optimal_utilization / SCALE || 0.8;
  const excess = cfg.excess_slope / SCALE;
  const x = Math.max(0, Math.min(1, u));
  if (x <= opt) return base + (opt > 0 ? slope * (x / opt) : 0);
  return base + slope + excess * ((x - opt) / (1 - opt || 1));
}

/** The USDC-like margin pool (the dUSDC borrow leg of the loop), or the first. */
export function pickUsdcMarginPool(
  pools: MarginPoolCreated[] | undefined,
): MarginPoolCreated | null {
  if (!pools?.length) return null;
  return pools.find((p) => /usdc/i.test(p.asset_type)) ?? pools[0];
}

/** The BTC/USDC spot pair — the on-chain CLOB venue Predict's oracle prices. */
export function pickBtcPair(
  rows: DeepBookSummary[] | undefined,
): DeepBookSummary | null {
  if (!rows?.length) return null;
  return (
    rows.find((r) => /btc/i.test(r.trading_pairs) && /usdc/i.test(r.trading_pairs)) ??
    rows.find((r) => /btc/i.test(r.trading_pairs)) ??
    null
  );
}
