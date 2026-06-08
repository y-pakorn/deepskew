/**
 * Write path for the PLP vault — the one place deepskew calls the Predict
 * contract instead of only reading it.
 *
 * `predict::supply<Quote>(predict, Coin<Quote>, clock) -> Coin<PLP>` and
 * `predict::withdraw<Quote>(predict, Coin<PLP>, clock) -> Coin<Quote>`
 * (predict-testnet-4-16). Supply mints LP shares against the vault; withdraw
 * burns them. Withdrawals are bounded on-chain by the solvency floor
 * (`balance − max_payout`) AND a token-bucket rate limiter (no fixed lock, a
 * continuously-refilling throughput cap), so the UI clamps to the live
 * `min(available_liquidity, available_withdrawal)`.
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
