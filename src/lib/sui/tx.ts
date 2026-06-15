/**
 * Write paths into the DeepBook Predict contract (predict-testnet-4-16).
 * deepskew is read-mostly; these are the places it signs on-chain rather than
 * only reading.
 *
 * Vault (LP side):
 *   predict::supply<Quote>(predict, Coin<Quote>, clock) -> Coin<PLP>
 *   predict::withdraw<Quote>(predict, Coin<PLP>, clock) -> Coin<Quote>
 * Supply mints LP shares against the vault; withdraw burns them. Withdrawals are
 * bounded on-chain by the solvency floor (balance - max_payout) AND a token-bucket
 * rate limiter (a continuously-refilling throughput cap, not a fixed lock), so the
 * UI clamps to the live min(available_liquidity, available_withdrawal).
 *
 * Trade (trader side), routed through a per-user shared PredictManager that holds
 * the quote balance positions are paid out of and into:
 *   predict::create_manager(ctx) -> ID                      creates + shares it
 *   predict_manager::deposit<Quote>(manager, Coin<Quote>)   fund the account
 *   predict_manager::withdraw<Quote>(manager, amount) -> Coin<Quote>   defund
 *   predict::mint<Quote>(predict, manager, oracle, MarketKey, qty, clock)
 *   predict::redeem<Quote>(predict, manager, oracle, MarketKey, qty, clock)
 * mint debits the manager balance by the post-trade ask * qty; redeem credits it
 * with bid * qty (or the settled $1 * qty). The MarketKey is built on-chain with
 * market_key::new(oracle_id, expiry, strike, is_up) and must match the oracle's
 * identity, expiry and strike grid. Amounts: quote/quantity are 1e6 (dUSDC),
 * strike is 1e9, expiry is ms.
 */
import { Transaction } from "@mysten/sui/transactions";
import { PREDICT_ID, PREDICT_PACKAGE_ID, QUOTE_ASSET_DUSDC } from "./constants";

/** The shared Clock object (0x6). */
const CLOCK = "0x6";

/** LP-share coin type minted/burned by the vault (deepbook_predict::plp::PLP). */
export const PLP_TYPE = `${PREDICT_PACKAGE_ID}::plp::PLP`;

/** Ensure a Move type's leading address carries the canonical `0x` prefix. The
 *  indexer / `type_name` emit quote-asset types without it; the SDK + gRPC want
 *  the 0x form for type arguments and coin-type filters. */
export function normalizeType(t: string): string {
  const sep = t.indexOf("::");
  if (sep < 0) return t;
  const addr = t.slice(0, sep);
  return addr.startsWith("0x") ? t : `0x${t}`;
}

/** The accepted dUSDC quote type, canonicalized. Prefer the live value from
 *  `/config` (PredictConfig.quote_assets) at the call site; this is the fallback. */
export const DUSDC_TYPE = normalizeType(QUOTE_ASSET_DUSDC);

export interface CoinRef {
  objectId: string;
  /** Base-unit balance, as a decimal string. */
  balance: string;
}

/** The slice of the gRPC Core client we need — kept structural so this module
 *  doesn't bind to the SDK's client type. */
export interface CoinReader {
  core: {
    listCoins(opts: {
      owner: string;
      coinType?: string;
      limit?: number;
      cursor?: string | null;
    }): Promise<{
      objects: ReadonlyArray<{ objectId: string; balance: string }>;
      hasNextPage: boolean;
      cursor: string | null;
    }>;
  };
}

/** Every coin object of `coinType` owned by `owner`, following pagination
 *  (hard-capped so a pathological wallet can't loop forever). */
export async function listAllCoins(
  client: CoinReader,
  owner: string,
  coinType: string,
): Promise<CoinRef[]> {
  const out: CoinRef[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page++) {
    const res = await client.core.listCoins({
      owner,
      coinType: normalizeType(coinType),
      cursor,
    });
    for (const c of res.objects) {
      out.push({ objectId: c.objectId, balance: c.balance });
    }
    if (!res.hasNextPage || !res.cursor) break;
    cursor = res.cursor;
  }
  return out;
}

/** Summed base-unit balance across coin objects. */
export function totalBalance(coins: CoinRef[]): bigint {
  return coins.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0));
}

/** Merge every coin into the first and return that primary coin argument. */
function consolidate(tx: Transaction, coins: CoinRef[]) {
  if (coins.length === 0) throw new Error("No coins to spend");
  const [first, ...rest] = coins;
  const primary = tx.object(first.objectId);
  if (rest.length) {
    tx.mergeCoins(
      primary,
      rest.map((c) => tx.object(c.objectId)),
    );
  }
  return primary;
}

/** Deposit: `supply<Quote>` `amount` base units, transferring the minted
 *  `Coin<PLP>` to the sender. */
export function buildSupplyTx(opts: {
  amount: bigint;
  coins: CoinRef[];
  sender: string;
  quoteType?: string;
}): Transaction {
  const quote = normalizeType(opts.quoteType ?? DUSDC_TYPE);
  const tx = new Transaction();
  const primary = consolidate(tx, opts.coins);
  const [supplyCoin] = tx.splitCoins(primary, [tx.pure.u64(opts.amount)]);
  const plp = tx.moveCall({
    target: `${PREDICT_PACKAGE_ID}::predict::supply`,
    typeArguments: [quote],
    arguments: [tx.object(PREDICT_ID), supplyCoin, tx.object(CLOCK)],
  });
  tx.transferObjects([plp], opts.sender);
  return tx;
}

/** Withdraw: burn `shares` base units of `Coin<PLP>` via `withdraw<Quote>`,
 *  transferring the returned `Coin<Quote>` to the sender. */
export function buildWithdrawTx(opts: {
  shares: bigint;
  plpCoins: CoinRef[];
  sender: string;
  quoteType?: string;
}): Transaction {
  const quote = normalizeType(opts.quoteType ?? DUSDC_TYPE);
  const tx = new Transaction();
  const primary = consolidate(tx, opts.plpCoins);
  const [lpCoin] = tx.splitCoins(primary, [tx.pure.u64(opts.shares)]);
  const out = tx.moveCall({
    target: `${PREDICT_PACKAGE_ID}::predict::withdraw`,
    typeArguments: [quote],
    arguments: [tx.object(PREDICT_ID), lpCoin, tx.object(CLOCK)],
  });
  tx.transferObjects([out], opts.sender);
  return tx;
}

// ─── Trade path: per-user PredictManager + binary mint / redeem ──────────────

/** Move call targets on the Predict package (predict-testnet-4-16). */
const TRADE_TARGET = {
  createManager: `${PREDICT_PACKAGE_ID}::predict::create_manager`,
  managerDeposit: `${PREDICT_PACKAGE_ID}::predict_manager::deposit`,
  managerWithdraw: `${PREDICT_PACKAGE_ID}::predict_manager::withdraw`,
  marketKeyNew: `${PREDICT_PACKAGE_ID}::market_key::new`,
  mint: `${PREDICT_PACKAGE_ID}::predict::mint`,
  redeem: `${PREDICT_PACKAGE_ID}::predict::redeem`,
} as const;

/** Create (and share) a PredictManager for the caller. `create_manager` returns
 *  the new id and emits PredictManagerCreated{manager_id, owner}; the object is
 *  shared, so the id is read back from the indexer (/managers?owner) once the tx
 *  lands rather than from the return value. */
export function buildCreateManagerTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({ target: TRADE_TARGET.createManager });
  return tx;
}

/** Fund a PredictManager: deposit `amount` base units of `Quote` into the
 *  account that mint debits and redeem credits. */
export function buildManagerDepositTx(opts: {
  managerId: string;
  amount: bigint;
  coins: CoinRef[];
  quoteType?: string;
}): Transaction {
  const quote = normalizeType(opts.quoteType ?? DUSDC_TYPE);
  const tx = new Transaction();
  const primary = consolidate(tx, opts.coins);
  const [coin] = tx.splitCoins(primary, [tx.pure.u64(opts.amount)]);
  tx.moveCall({
    target: TRADE_TARGET.managerDeposit,
    typeArguments: [quote],
    arguments: [tx.object(opts.managerId), coin],
  });
  return tx;
}

/** Defund a PredictManager: withdraw `amount` base units of `Quote` back to the
 *  owner's wallet. */
export function buildManagerWithdrawTx(opts: {
  managerId: string;
  amount: bigint;
  sender: string;
  quoteType?: string;
}): Transaction {
  const quote = normalizeType(opts.quoteType ?? DUSDC_TYPE);
  const tx = new Transaction();
  const coin = tx.moveCall({
    target: TRADE_TARGET.managerWithdraw,
    typeArguments: [quote],
    arguments: [tx.object(opts.managerId), tx.pure.u64(opts.amount)],
  });
  tx.transferObjects([coin], opts.sender);
  return tx;
}

export interface TradeLeg {
  managerId: string;
  oracleId: string;
  /** Oracle expiry in ms; must equal the oracle's on-chain expiry. */
  expiry: bigint;
  /** Strike, 1e9-scaled, snapped onto the oracle grid (min_strike + n·tick). */
  strike: bigint;
  isUp: boolean;
  /** Position size in 1e6 base units (= the max payout in dUSDC base units). */
  quantity: bigint;
  quoteType?: string;
}

/** Build a MarketKey via market_key::new(oracle_id, expiry, strike, is_up). A
 *  Move `ID` is BCS-identical to `address`, so the oracle id is passed as a pure
 *  address; the returned key (copy + drop + store) is consumed by mint / redeem
 *  in the same PTB. */
function marketKey(tx: Transaction, leg: TradeLeg) {
  return tx.moveCall({
    target: TRADE_TARGET.marketKeyNew,
    arguments: [
      tx.pure.address(leg.oracleId),
      tx.pure.u64(leg.expiry),
      tx.pure.u64(leg.strike),
      tx.pure.bool(leg.isUp),
    ],
  });
}

/** Open a binary position: predict::mint<Quote>. The cost (post-trade ask ×
 *  quantity) is debited from the manager's quote balance, so the manager must be
 *  funded first; pass `fund` to deposit-then-mint atomically in one signature. */
export function buildMintTx(
  leg: TradeLeg & { fund?: { coins: CoinRef[]; amount: bigint } },
): Transaction {
  const quote = normalizeType(leg.quoteType ?? DUSDC_TYPE);
  const tx = new Transaction();
  const manager = tx.object(leg.managerId);
  if (leg.fund && leg.fund.amount > BigInt(0)) {
    const primary = consolidate(tx, leg.fund.coins);
    const [coin] = tx.splitCoins(primary, [tx.pure.u64(leg.fund.amount)]);
    tx.moveCall({
      target: TRADE_TARGET.managerDeposit,
      typeArguments: [quote],
      arguments: [manager, coin],
    });
  }
  const key = marketKey(tx, leg);
  tx.moveCall({
    target: TRADE_TARGET.mint,
    typeArguments: [quote],
    arguments: [
      tx.object(PREDICT_ID),
      manager,
      tx.object(leg.oracleId),
      key,
      tx.pure.u64(leg.quantity),
      tx.object(CLOCK),
    ],
  });
  return tx;
}

/** Close a binary position: predict::redeem<Quote>. Payout (bid × quantity
 *  pre-settlement, or $1 × quantity if settled in the money) is credited to the
 *  manager's quote balance; pull it out with buildManagerWithdrawTx. */
export function buildRedeemTx(leg: TradeLeg): Transaction {
  const quote = normalizeType(leg.quoteType ?? DUSDC_TYPE);
  const tx = new Transaction();
  const key = marketKey(tx, leg);
  tx.moveCall({
    target: TRADE_TARGET.redeem,
    typeArguments: [quote],
    arguments: [
      tx.object(PREDICT_ID),
      tx.object(leg.managerId),
      tx.object(leg.oracleId),
      key,
      tx.pure.u64(leg.quantity),
      tx.object(CLOCK),
    ],
  });
  return tx;
}
