/**
 * DeepBook Predict — testnet identifiers and indexer config.
 * Branch: predict-testnet-4-16. Sample IDs are quickstart values —
 * re-resolve the authoritative package id + quote asset from `/config`
 * and the active oracle/predict from `/oracles` at runtime.
 */

export const SUI_NETWORK = "testnet" as const;

/** Predict Move package (confirm via indexer `/config`). */
export const PREDICT_PACKAGE_ID =
  "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";

/** The Predict market shared object. */
export const PREDICT_ID =
  "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a";

/** Default headline oracle (one rolling BTC expiry). */
export const DEFAULT_ORACLE_ID =
  "0x826344056d0d520e0abc409b0b6aeb5521c5908bacc6112409dd0e10da43d6cf";

/** Quote asset: dUSDC (NOT official testnet USDC). */
export const QUOTE_ASSET_DUSDC =
  "e95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC";

/** dUSDC decimals (quote units → human). */
export const DUSDC_DECIMALS = 6;

/** Predict indexer (REST) base URL — testnet. */
export const INDEXER_BASE_URL = "https://predict-server.testnet.mystenlabs.com";

/** Testnet gRPC fullnode (Sui 2.x Core API client). */
export const SUI_GRPC_URL = "https://fullnode.testnet.sui.io:443";

/** Testnet GraphQL endpoint (filtered/historical event queries). */
export const SUI_GRAPHQL_URL = "https://sui-testnet.mystenlabs.com/graphql";

/**
 * Fixed-point scaling for raw SVI params (INFERRED — confirm against
 * oracle.move). Sample a:27673 → a≈2.77e-5 implies divide by 1e9.
 */
export const SVI_FIXED_POINT = 1e9;

/** Spot / forward / strike prices from the indexer are 1e9-scaled (verified live). */
export const PRICE_FIXED_POINT = 1e9;

/** Oracle event Move types for Tier-2 freshness. */
export const ORACLE_EVENT = {
  pricesUpdated: "OraclePricesUpdated",
  sviUpdated: "OracleSVIUpdated",
  settled: "OracleSettled",
  activated: "OracleActivated",
} as const;

export const oracleEventType = (
  name: (typeof ORACLE_EVENT)[keyof typeof ORACLE_EVENT],
) => `${PREDICT_PACKAGE_ID}::oracle::${name}`;

/** Explorer link helper (testnet). */
export const explorerTx = (digest: string) =>
  `https://suiscan.xyz/testnet/tx/${digest}`;
export const explorerObject = (id: string) =>
  `https://suiscan.xyz/testnet/object/${id}`;
export const explorerAccount = (address: string) =>
  `https://suiscan.xyz/testnet/account/${address}`;
