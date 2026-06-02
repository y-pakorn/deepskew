/** Validated response shapes for the Predict indexer (captured live, 2026). */

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

/** GET /oracles/:id/svi/latest — raw fixed-point SVI params. */
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

/** One oracle row from GET /oracles (shape is loosely documented). */
export interface OracleRef {
  predict_id: string;
  oracle_id: string;
  [key: string]: unknown;
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
