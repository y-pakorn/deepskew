/** Validated response shapes for the Predict indexer (server.rs, predict-testnet-4-16). */

/** One indexer pipeline's watermark + lag (server.rs `build_status_payload`). */
export interface PipelineStatus {
  pipeline: string;
  checkpoint_hi_inclusive: number;
  timestamp_ms_hi_inclusive: number;
  epoch_hi_inclusive: number;
  checkpoint_lag: number;
  time_lag_ms: number;
  time_lag_seconds: number;
  latest_onchain_checkpoint: number;
  is_backfill: boolean;
}

export interface IndexerStatus {
  status: string;
  latest_onchain_checkpoint: number;
  earliest_checkpoint?: number;
  current_time_ms: number;
  max_lag_pipeline?: string;
  max_checkpoint_lag: number;
  max_time_lag_seconds: number;
  pipelines: PipelineStatus[];
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

/** GET /oracles/:id/ask-bounds — the mintable ask-price clamp, or null if unset.
 *  Prices are 1e9-scaled probabilities (0..1e9). */
export interface OracleAskBounds {
  event_digest: string;
  digest: string;
  sender: string;
  checkpoint: number;
  checkpoint_timestamp_ms: number;
  tx_index: number;
  event_index: number;
  package: string;
  predict_id: string;
  oracle_id: string;
  min_ask_price: number; // 1e9-scaled
  max_ask_price: number; // 1e9-scaled
}

/** GET /oracles/:id/state — one-shot: oracle meta + latest price + latest SVI. */
export interface OracleStateResponse {
  oracle: OracleInfo;
  latest_price: OraclePrice | null;
  latest_svi: SviLatest | null;
  ask_bounds: OracleAskBounds | null;
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
  current_unrealized_pnl: number; // 1e6
  current_total_pnl: number; // 1e6
}

/** GET /positions/minted — a binary position was opened. Amounts 1e6, strike 1e9. */
export interface PositionMinted {
  checkpoint_timestamp_ms: number;
  digest: string;
  manager_id: string;
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
  manager_id: string;
  owner: string;
  oracle_id: string;
  expiry: number;
  strike: number;
  is_up: boolean;
  quantity: number;
  payout: number;
  is_settled: boolean;
}

/** GET /lp/supplies — an LP supplied quote into the PLP vault. Amount 1e6. */
export interface LpSupply {
  checkpoint_timestamp_ms: number;
  supplier: string;
  amount: number;
  shares_minted: number;
}

/** GET /lp/withdrawals — an LP withdrew from the PLP vault. Amount 1e6. */
export interface LpWithdrawal {
  checkpoint_timestamp_ms: number;
  withdrawer: string;
  amount: number;
  shares_burned: number;
}

/** GET /ranges/minted — a range (vertical-spread) position was opened.
 *  Strikes 1e9-scaled, amounts 1e6, ask_price 1e9 (probability). */
export interface RangeMinted {
  checkpoint_timestamp_ms: number;
  digest: string;
  manager_id: string;
  trader: string;
  oracle_id: string;
  expiry: number;
  lower_strike: number; // 1e9
  higher_strike: number; // 1e9
  quantity: number; // 1e6
  cost: number; // 1e6
  ask_price: number; // 1e9
}

/** GET /ranges/redeemed — a range position was settled/redeemed. */
export interface RangeRedeemed {
  checkpoint_timestamp_ms: number;
  digest: string;
  manager_id: string;
  trader: string;
  oracle_id: string;
  expiry: number;
  lower_strike: number; // 1e9
  higher_strike: number; // 1e9
  quantity: number; // 1e6
  payout: number; // 1e6
  bid_price: number; // 1e9
  is_settled: boolean;
}

/** GET /managers — the owner↔manager directory (PredictManagerCreated rows). */
export interface ManagerCreated {
  checkpoint_timestamp_ms: number;
  manager_id: string;
  owner: string;
}

/** One quote-asset balance inside a manager account. Amount 1e6. */
export interface AssetBalance {
  quote_asset: string;
  balance: number;
}

/** GET /managers/:id/positions — a manager's raw binary mint/redeem events. */
export interface ManagerTrades {
  minted: PositionMinted[];
  redeemed: PositionRedeemed[];
}

/** GET /managers/:id/ranges — a manager's range mint/redeem events. */
export interface ManagerRangePositions {
  minted: RangeMinted[];
  redeemed: RangeRedeemed[];
}

/** GET /managers/:id/summary — account roll-up (all amounts 1e6). */
export interface ManagerSummary {
  manager_id: string;
  owner: string;
  balances: AssetBalance[];
  trading_balance: number;
  open_exposure: number;
  redeemable_value: number;
  realized_pnl: number;
  unrealized_pnl: number;
  account_value: number;
  open_positions: number;
  awaiting_settlement_positions: number;
}

/** GET /managers/:id/positions/summary — one (oracle,strike,side) line, marked
 *  server-side. Amounts 1e6; prices 1e9. `status` ∈ open/awaiting_settlement/
 *  redeemable/redeemed/lost (derived server-side). */
export interface ManagerPositionSummary {
  predict_id: string;
  manager_id: string;
  quote_asset: string;
  oracle_id: string;
  underlying_asset: string | null;
  expiry: number;
  strike: number; // 1e9
  is_up: boolean;
  minted_quantity: number; // 1e6
  redeemed_quantity: number; // 1e6
  open_quantity: number; // 1e6
  total_cost: number; // 1e6
  total_payout: number; // 1e6
  realized_pnl: number; // 1e6
  unrealized_pnl: number; // 1e6
  open_cost_basis: number; // 1e6
  average_entry_price: number | null; // 1e9
  average_exit_price: number | null; // 1e9
  mark_price: number | null; // 1e9
  mark_value: number | null; // 1e6
  status: string;
  first_minted_at: number;
  last_activity_at: number;
}

/** PricingConfig (serialized PricingConfigUpdated row). Null until published.
 *  Spread params 1e9-scaled; ask bounds 1e9 (probability). */
export interface PricingConfig {
  base_spread: number;
  min_spread: number;
  utilization_multiplier: number;
  min_ask_price: number;
  max_ask_price: number;
}

/** RiskConfig (serialized RiskConfigUpdated row). Null until published. */
export interface RiskConfig {
  max_total_exposure_pct: number; // 1e9-scaled fraction (e.g. 0.8e9)
}

/** GET /config and GET /predicts/:id/state — live house rules. Any of
 *  pricing/risk/trading_paused may be null when not yet published on-chain. */
export interface PredictConfig {
  predict_id: string;
  pricing: PricingConfig | null;
  risk: RiskConfig | null;
  trading_paused: boolean | null;
  quote_assets: string[];
}
