/** Validated response shapes for the Predict indexer (server.rs, predict-testnet-4-16). */

export interface IndexerStatus {
  status: string;
  latest_onchain_checkpoint: number;
  earliest_checkpoint?: number;
  current_time_ms: number;
  max_lag_pipeline?: string;
  max_checkpoint_lag: number;
  max_time_lag_seconds: number;
  pipelines: unknown[];
}

export type OracleStatus = "created" | "active" | "settled";

/** GET /oracles entry + OracleStateResponse.oracle (server.rs `OracleInfo`).
 *  Prices/strikes are 1e9-scaled. `status` is derived: settled_at → settled,
 *  else activated_at → active, else created. */
export interface OracleInfo {
  predict_id: string;
  oracle_id: string;
  oracle_cap_id: string;
  underlying_asset: string;
  expiry: number; // ms
  min_strike: number; // 1e9-scaled
  tick_size: number; // 1e9-scaled
  status: OracleStatus;
  activated_at: number | null;
  settlement_price: number | null; // 1e9-scaled
  settled_at: number | null;
  created_checkpoint: number;
}

/** GET /oracles/:id/svi/latest (and state.latest_svi). Raw fixed-point SVI. */
export interface SviLatest {
  event_digest: string;
  digest: string;
  sender: string;
  checkpoint: number;
  checkpoint_timestamp_ms: number;
  tx_index: number;
  event_index: number;
  package: string;
  oracle_id: string;
  a: number;
  b: number;
  rho: number;
  rho_negative: boolean;
  m: number;
  m_negative: boolean;
  sigma: number;
  onchain_timestamp: number;
}

/** GET /oracles/:id/prices/latest (and state.latest_price). Prices are 1e9-scaled. */
export interface OraclePrice {
  event_digest: string;
  digest: string;
  sender: string;
  checkpoint: number;
  checkpoint_timestamp_ms: number;
  tx_index: number;
  event_index: number;
  package: string;
  oracle_id: string;
  spot: number; // 1e9-scaled
  forward: number; // 1e9-scaled
  onchain_timestamp: number;
}

/** GET /oracles/:id/state — one-shot: oracle meta + latest price + latest SVI. */
export interface OracleStateResponse {
  oracle: OracleInfo;
  latest_price: OraclePrice | null;
  latest_svi: SviLatest | null;
  ask_bounds: unknown | null;
}

/** GET /predicts/:id/vault/summary — PLP vault state. */
export interface VaultSummary {
  predict_id: string;
  quote_assets: string[];
  vault_balance: number;
  vault_value: number;
  total_mtm: number;
  total_max_payout: number;
  available_liquidity: number;
  available_withdrawal: number;
  plp_total_supply: number;
  plp_share_price: number;
  utilization: number;
  max_payout_utilization: number;
  net_deposits: number;
  total_supplied: number;
  total_withdrawn: number;
}

export interface VaultPerfPoint {
  timestamp_ms: number;
  share_price: number;
  vault_value: number;
  total_shares: number;
}

export interface VaultPerformance {
  predict_id: string;
  range: string;
  points: VaultPerfPoint[];
}

export interface PnlPoint {
  timestamp_ms: number;
  realized_pnl: number;
  cumulative_realized_pnl: number;
}

export interface ManagerPnl {
  manager_id: string;
  range: string;
  series_type: string;
  points: PnlPoint[];
}

/** GET /positions/minted — a binary position was opened. Amounts 1e6, strike 1e9. */
export interface PositionMinted {
  checkpoint_timestamp_ms: number;
  digest: string;
  trader: string;
  oracle_id: string;
  expiry: number;
  strike: number;
  is_up: boolean;
  quantity: number;
  cost: number;
  ask_price: number;
}

/** GET /positions/redeemed — a binary position was settled/redeemed. */
export interface PositionRedeemed {
  checkpoint_timestamp_ms: number;
  digest: string;
  owner: string;
  oracle_id: string;
  expiry: number;
  strike: number;
  is_up: boolean;
  quantity: number;
  payout: number;
  is_settled: boolean;
}
