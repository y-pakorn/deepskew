"use client";

import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { dAppKit } from "@/lib/sui/dapp-kit";
import {
  buildCreateManagerTx,
  buildManagerDepositTx,
  buildManagerWithdrawTx,
  buildMintTx,
  buildRedeemTx,
  DUSDC_TYPE,
  listAllCoins,
  normalizeType,
  totalBalance,
  type CoinRef,
} from "@/lib/sui/tx";
import type { Transaction } from "@mysten/sui/transactions";
import {
  useAccount,
  useManagerPositions,
  useManagerSummary,
  useOracleState,
  usePredictConfig,
  useVaultSummary,
} from "@/lib/indexer/hooks";
import { useMarket } from "../market-context";
import { binaryQuote, decodeSvi, digitalProb } from "@/lib/svi";
import {
  DUSDC_DECIMALS,
  explorerTx,
  PRICE_FIXED_POINT,
} from "@/lib/sui/constants";
import type { ManagerPositionSummary } from "@/lib/indexer/types";
import { fmtDuration, fmtNum, fmtPct, fmtUsdCompact, fromUnits } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";
import { Pill } from "../pill";
import { Hero, Stat } from "../stat";

type Tab = "buy" | "sell" | "account";

/** The oracle strike grid is min_strike + n·tick over this many ticks
 *  (constants::oracle_strike_grid_ticks!, predict-testnet-4-16). */
const GRID_TICKS = 100_000;

const posKey = (p: ManagerPositionSummary) =>
  `${p.oracle_id}:${p.strike}:${p.is_up}`;

/**
 * Trade: the desk's trader-side write path. It leads with the model-fair binary
 * price (the same N(d₂) off the live SVI that the desk scores every fill
 * against), shows the exact on-chain ask and the vault spread you cross, then
 * runs the full loop on Predict: create a PredictManager, fund it, mint a binary
 * (predict::mint), redeem it (predict::redeem), and withdraw back to the wallet.
 * The mint cost is debited from the manager balance on-chain, so an underfunded
 * buy funds the shortfall in the same signature. Connect-gated; every fill links
 * to its digest on Suiscan.
 */
export function TradePanel({ className }: { className?: string }) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const owner = account?.address ?? null;
  const qc = useQueryClient();
  const now = useNow();

  const { selectedOracleId, selectedOracle } = useMarket();
  const { data: state } = useOracleState(selectedOracleId);
  const { data: config } = usePredictConfig();
  const { data: vault } = useVaultSummary();
  const { managerIds } = useAccount();
  const managerId = managerIds[0] ?? null;
  const { data: mgr } = useManagerSummary(managerId);
  const { data: positions = [] } = useManagerPositions(managerId);

  const quoteType = config?.quote_assets?.[0] ?? DUSDC_TYPE;
  const qt = normalizeType(quoteType);

  const [tab, setTab] = useState<Tab>("buy");
  const [side, setSide] = useState(true); // true = Up
  const [strikeInput, setStrikeInput] = useState("");
  const [payoutInput, setPayoutInput] = useState("");
  const [acctMode, setAcctMode] = useState<"deposit" | "withdraw">("deposit");
  const [acctInput, setAcctInput] = useState("");
  const [selPos, setSelPos] = useState<string | null>(null);
  const [redeemInput, setRedeemInput] = useState("");
  const [pending, setPending] = useState(false);

  // Connected wallet dUSDC (base units), straight from the gRPC core client.
  const dusdc = useQuery({
    queryKey: ["balance", owner, "dusdc"],
    enabled: !!owner,
    refetchInterval: 15_000,
    queryFn: async () => {
      const r = await client.core.getBalance({ owner: owner!, coinType: qt });
      return BigInt(r.balance.balance);
    },
  });
  const walletBase = dusdc.data != null ? Number(dusdc.data) : 0;
  const walletHuman = walletBase / 1e6;

  // Manager (trading account) quote balance, base units.
  const mgrBalBase = useMemo(() => {
    if (!mgr) return 0;
    const e = mgr.balances.find((b) => normalizeType(b.quote_asset) === qt);
    return e?.balance ?? mgr.trading_balance ?? 0;
  }, [mgr, qt]);
  const mgrBalHuman = fromUnits(mgrBalBase, DUSDC_DECIMALS);

  // ─── Market math ──────────────────────────────────────────────────────────
  const forwardRaw = state?.latest_price?.forward ?? 0;
  const forward = forwardRaw / PRICE_FIXED_POINT;
  const svi = state?.latest_svi ? decodeSvi(state.latest_svi) : null;
  const minStrikeRaw = selectedOracle?.min_strike ?? 0;
  const tickRaw = selectedOracle?.tick_size ?? 0;
  const maxStrikeRaw = minStrikeRaw + tickRaw * GRID_TICKS;

  const snap = useMemo(() => {
    return (raw: number) => {
      if (tickRaw <= 0) return raw;
      const n = Math.round((raw - minStrikeRaw) / tickRaw);
      const s = minStrikeRaw + n * tickRaw;
      return Math.min(maxStrikeRaw, Math.max(minStrikeRaw, s));
    };
  }, [minStrikeRaw, tickRaw, maxStrikeRaw]);

  const atmRaw = forwardRaw > 0 ? snap(forwardRaw) : 0;
  const strikeRaw = useMemo(() => {
    const v = Number(strikeInput);
    if (strikeInput && v > 0) return snap(Math.round(v * PRICE_FIXED_POINT));
    return atmRaw;
  }, [strikeInput, atmRaw, snap]);
  const strikeF = strikeRaw / PRICE_FIXED_POINT;
  const moneyness = forward > 0 && strikeF > 0 ? strikeF / forward - 1 : 0;
  const k = forward > 0 && strikeF > 0 ? Math.log(strikeF / forward) : 0;

  const pc = config?.pricing ?? null;

  // Model-fair (N(d₂)) needs only the live SVI, so it always renders. The ask /
  // bid (fair ± vault spread) additionally need the pricing-config feed; when
  // the indexer has not published it (pricing is null on testnet today), the
  // premium is shown as the fair-value floor and the contract applies the real
  // spread on-chain at mint.
  const fair = useMemo(
    () => (svi && forward > 0 && strikeF > 0 ? digitalProb(k, svi, side) : null),
    [svi, forward, strikeF, k, side],
  );
  const quote = useMemo(() => {
    if (!svi || !pc || forward <= 0) return null;
    return binaryQuote(k, svi, side, {
      baseSpread: pc.base_spread / 1e9,
      minSpread: pc.min_spread / 1e9,
      utilMultiplier: pc.utilization_multiplier / 1e9,
      liability: vault?.total_mtm ?? 0,
      balance: vault?.vault_balance ?? 0,
    });
  }, [svi, pc, k, side, vault, forward]);

  // Mintable band: the side ask must sit within the resolved ask bounds (the
  // global pricing-config clamp intersected with any per-oracle override).
  // Only checkable when both the quote and the bounds are published.
  const bounds = useMemo(() => {
    if (!pc) return null;
    let lo = pc.min_ask_price / 1e9;
    let hi = pc.max_ask_price / 1e9;
    if (state?.ask_bounds) {
      lo = Math.max(lo, state.ask_bounds.min_ask_price / 1e9);
      hi = Math.min(hi, state.ask_bounds.max_ask_price / 1e9);
    }
    return { lo, hi };
  }, [pc, state]);
  const askOutOfBounds =
    !!quote && !!bounds && (quote.ask < bounds.lo - 1e-9 || quote.ask > bounds.hi + 1e-9);

  const payout = Number(payoutInput) || 0; // dUSDC max payout (notional)
  const quantityBase = Math.round(payout * 1e6);
  // Premium estimate: exact when the ask is known, else the fair-value floor.
  const priceForCost = quote ? quote.ask : fair ?? 0;
  const costHuman = priceForCost * payout;
  const costBase = Math.round(costHuman * 1e6);
  const edgeBps = quote ? (quote.ask - quote.fair) * 10_000 : 0;
  // Fund so the manager covers the cost. cost ≤ 1 × notional, so when the ask is
  // unknown we target the full notional; when known, the cost plus a small
  // buffer for the trade's own utilization impact, capped at the notional.
  const fundTargetBase = quote
    ? Math.min(quantityBase, Math.ceil(costBase * 1.03))
    : quantityBase;

  const expiryMs = selectedOracle?.expiry ?? 0;
  const ttx = expiryMs > 0 ? Math.max(0, expiryMs - now) : 0;
  const expired = expiryMs > 0 && now >= expiryMs;
  const expiryUtc =
    expiryMs > 0 ? new Date(expiryMs).toISOString().slice(11, 16) : "--:--";
  const tradingPaused = config?.trading_paused === true;
  const oracleLive = selectedOracle?.status === "active" && !expired;
  const marketReady = !!svi && forward > 0 && !!selectedOracle;

  const openPositions = useMemo(
    () => positions.filter((p) => p.open_quantity > 0),
    [positions],
  );
  const pos = openPositions.find((p) => posKey(p) === selPos) ?? null;

  // ─── Actions ────────────────────────────────────────────────────────────
  async function sign(tx: Transaction, ok: string) {
    const res = await dAppKit.signAndExecuteTransaction({ transaction: tx });
    if (res.$kind === "FailedTransaction") throw new Error("Transaction failed on-chain");
    const digest = res.Transaction.digest;
    toast.success(ok, {
      description: `${digest.slice(0, 10)}…`,
      action: {
        label: "Suiscan",
        onClick: () => window.open(explorerTx(digest), "_blank", "noopener"),
      },
    });
    qc.invalidateQueries({ queryKey: ["manager"] });
    qc.invalidateQueries({ queryKey: ["managers"] });
    qc.invalidateQueries({ queryKey: ["predict"] });
    qc.invalidateQueries({ queryKey: ["balance", owner] });
  }

  async function createAccount() {
    if (!owner || pending) return;
    setPending(true);
    try {
      await sign(buildCreateManagerTx(), "Trading account created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setPending(false);
    }
  }

  async function buy() {
    if (!owner || !managerId || !quote || !selectedOracle || !selectedOracleId) return;
    if (payout <= 0 || pending) return;
    setPending(true);
    try {
      const quantity = BigInt(quantityBase);
      if (quantity <= BigInt(0)) throw new Error("Enter a position size");
      // Fund any shortfall in the same PTB so a buy is one signature.
      const need = fundTargetBase - mgrBalBase;
      let fund: { coins: CoinRef[]; amount: bigint } | undefined;
      if (need > 0) {
        const coins = await listAllCoins(client, owner, quoteType);
        const amount = BigInt(Math.ceil(need));
        if (totalBalance(coins) < amount) {
          throw new Error("Insufficient dUSDC to fund this trade");
        }
        fund = { coins, amount };
      }
      const tx = buildMintTx({
        managerId,
        oracleId: selectedOracleId,
        expiry: BigInt(Math.round(selectedOracle.expiry)),
        strike: BigInt(Math.round(strikeRaw)),
        isUp: side,
        quantity,
        quoteType,
        fund,
      });
      await sign(
        tx,
        `Bought ${fmtUsdCompact(payout)} ${side ? "Up" : "Dn"} @ ${fmtNum(strikeF, 0)}`,
      );
      setPayoutInput("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setPending(false);
    }
  }

  async function sell() {
    if (!owner || !managerId || !pos || pending) return;
    setPending(true);
    try {
      const req = Number(redeemInput) || 0;
      let qtyBase = req > 0 ? Math.round(req * 1e6) : pos.open_quantity;
      if (qtyBase > pos.open_quantity) qtyBase = pos.open_quantity;
      if (qtyBase <= 0) throw new Error("Nothing to redeem");
      const tx = buildRedeemTx({
        managerId,
        oracleId: pos.oracle_id,
        expiry: BigInt(Math.round(pos.expiry)),
        strike: BigInt(Math.round(pos.strike)),
        isUp: pos.is_up,
        quantity: BigInt(qtyBase),
        quoteType,
      });
      await sign(tx, `Redeemed ${fmtUsdCompact(qtyBase / 1e6)} ${pos.is_up ? "Up" : "Dn"}`);
      setRedeemInput("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setPending(false);
    }
  }

  async function acct() {
    if (!owner || !managerId || pending) return;
    const amt = Number(acctInput) || 0;
    if (amt <= 0) return;
    setPending(true);
    try {
      const base = BigInt(Math.round(amt * 1e6));
      let tx;
      if (acctMode === "deposit") {
        const coins = await listAllCoins(client, owner, quoteType);
        if (totalBalance(coins) < base) throw new Error("Insufficient dUSDC balance");
        tx = buildManagerDepositTx({ managerId, amount: base, coins, quoteType });
      } else {
        if (base > BigInt(Math.floor(mgrBalBase))) throw new Error("Exceeds account balance");
        tx = buildManagerWithdrawTx({ managerId, amount: base, sender: owner, quoteType });
      }
      await sign(tx, `${acctMode === "deposit" ? "Deposited" : "Withdrew"} ${fmtUsdCompact(amt)} dUSDC`);
      setAcctInput("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setPending(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Panel
      title="Trade"
      code="Mint · redeem"
      className={className}
      right={
        owner ? (
          managerId ? (
            <span className="text-data tabular text-text-dim">
              {fmtNum(mgrBalHuman, 2)} dUSDC
            </span>
          ) : (
            <Pill tone="warn">No account</Pill>
          )
        ) : (
          <Pill tone="neutral">Not connected</Pill>
        )
      }
    >
      {!marketReady ? (
        <PanelState kind="empty">Loading market…</PanelState>
      ) : (
        <div className="flex min-h-0 flex-col gap-3">
          {/* Tabs */}
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-hairline bg-hairline">
            {(["buy", "sell", "account"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "py-1.5 text-data font-medium capitalize transition-colors",
                  tab === t
                    ? "bg-panel-elev text-foreground"
                    : "bg-panel text-text-dim hover:text-text-sec",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "buy" ? (
            <>
              <Hero
                label={`Model-fair · ${side ? "Up" : "Dn"} @ ${fmtNum(strikeF, 0)}`}
                tip="edge-bps"
                value={fair != null ? fmtPct(fair, 1) : "—"}
                tone="default"
                accessory={
                  <Pill tone={expired ? "warn" : "neutral"}>
                    {expired ? "Expired" : `exp ${fmtDuration(ttx)}`}
                  </Pill>
                }
                sub={
                  quote
                    ? `Pay ${fmtPct(quote.ask, 1)} ask · cross ${fmtNum(edgeBps, 0)} bps to the vault`
                    : "Premium = fair + vault spread, priced on-chain"
                }
              />

              {/* Up / Dn */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-hairline bg-hairline">
                {[true, false].map((up) => (
                  <button
                    key={String(up)}
                    type="button"
                    onClick={() => setSide(up)}
                    className={cn(
                      "py-1.5 text-data font-medium transition-colors",
                      side === up
                        ? up
                          ? "bg-safe/15 text-safe"
                          : "bg-breach/15 text-breach"
                        : "bg-panel text-text-dim hover:text-text-sec",
                    )}
                  >
                    {up ? "▲ Up" : "▼ Dn"}
                  </button>
                ))}
              </div>

              {/* Strike */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="label-micro">Strike (USD)</span>
                  <button
                    type="button"
                    onClick={() => setStrikeInput("")}
                    className="text-data text-text-faint tabular hover:text-text-sec"
                  >
                    ATM {fmtNum(forward, 0)} · {fmtPct(moneyness, 1)}
                  </button>
                </div>
                <input
                  inputMode="decimal"
                  placeholder={fmtNum(atmRaw / PRICE_FIXED_POINT, 0)}
                  value={strikeInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setStrikeInput(v);
                  }}
                  className="tabular w-full rounded-md border border-hairline bg-panel-elev px-3 py-2 text-md font-medium text-foreground outline-none focus:border-accent-brand/60"
                />
              </div>

              {/* Payout / size */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="label-micro">Max payout (dUSDC)</span>
                  <span className="text-data text-text-faint">
                    what you win if it hits
                  </span>
                </div>
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={payoutInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setPayoutInput(v);
                  }}
                  className="tabular w-full rounded-md border border-hairline bg-panel-elev px-3 py-2 text-md font-medium text-foreground outline-none focus:border-accent-brand/60"
                />
              </div>

              <div className="rounded-md border border-hairline px-3 py-1">
                <Stat
                  label="Cost (premium)"
                  value={
                    quote
                      ? `${fmtNum(costHuman, 2)} dUSDC`
                      : `≈ ${fmtNum(costHuman, 2)}+ dUSDC`
                  }
                  tone="accent"
                />
                <Stat
                  label="Expires"
                  value={`${expiryUtc} UTC · ${fmtDuration(ttx)}`}
                  tone={expired ? "warn" : "default"}
                />
                <Stat label="Bid (sell back)" value={quote ? fmtPct(quote.bid, 1) : "—"} />
                <Stat label="Wallet" value={`${fmtNum(walletHuman, 2)} dUSDC`} />
                <Stat label="Account balance" value={`${fmtNum(mgrBalHuman, 2)} dUSDC`} />
              </div>

              <BuyButton
                owner={owner}
                hasManager={!!managerId}
                pending={pending}
                disabled={
                  payout <= 0 ||
                  askOutOfBounds ||
                  tradingPaused ||
                  !oracleLive
                }
                reason={
                  tradingPaused
                    ? "Trading paused"
                    : expired
                      ? "Market expired"
                      : !oracleLive
                        ? "Market not live"
                        : askOutOfBounds
                          ? "Outside mintable band"
                          : payout <= 0
                            ? "Enter a size"
                            : null
                }
                side={side}
                onCreate={createAccount}
                onBuy={buy}
              />
            </>
          ) : tab === "sell" ? (
            <SellTab
              positions={openPositions}
              selKey={selPos}
              onSelect={setSelPos}
              pos={pos}
              redeemInput={redeemInput}
              setRedeemInput={setRedeemInput}
              owner={owner}
              pending={pending}
              onSell={sell}
            />
          ) : (
            <AccountTab
              owner={owner}
              managerId={managerId}
              pending={pending}
              mode={acctMode}
              setMode={setAcctMode}
              input={acctInput}
              setInput={setAcctInput}
              walletHuman={walletHuman}
              mgrBalHuman={mgrBalHuman}
              onCreate={createAccount}
              onSubmit={acct}
            />
          )}
        </div>
      )}
    </Panel>
  );
}

function BuyButton({
  owner,
  hasManager,
  pending,
  disabled,
  reason,
  side,
  onCreate,
  onBuy,
}: {
  owner: string | null;
  hasManager: boolean;
  pending: boolean;
  disabled: boolean;
  reason: string | null;
  side: boolean;
  onCreate: () => void;
  onBuy: () => void;
}) {
  if (!owner) {
    return <ActionButton disabled label="Connect a wallet to trade" onClick={() => {}} />;
  }
  if (!hasManager) {
    return (
      <ActionButton
        label={pending ? "Confirming…" : "Create a trading account"}
        disabled={pending}
        onClick={onCreate}
        note="One predict::create_manager on Testnet, then fund and trade"
      />
    );
  }
  return (
    <ActionButton
      label={
        pending ? "Confirming…" : reason ? reason : `Buy ${side ? "Up" : "Dn"}`
      }
      disabled={disabled || pending}
      onClick={onBuy}
      tone={side ? "up" : "down"}
      note="Signs a real predict::mint on Testnet · auto-funds from wallet if needed"
    />
  );
}

function SellTab({
  positions,
  selKey,
  onSelect,
  pos,
  redeemInput,
  setRedeemInput,
  owner,
  pending,
  onSell,
}: {
  positions: ManagerPositionSummary[];
  selKey: string | null;
  onSelect: (k: string) => void;
  pos: ManagerPositionSummary | null;
  redeemInput: string;
  setRedeemInput: (v: string) => void;
  owner: string | null;
  pending: boolean;
  onSell: () => void;
}) {
  if (!owner) {
    return <PanelState kind="empty">Connect a wallet to see your positions</PanelState>;
  }
  if (!positions.length) {
    return <PanelState kind="empty">No open positions</PanelState>;
  }
  const markHuman = pos?.mark_value != null ? pos.mark_value / 1e6 : 0;
  const openHuman = pos ? pos.open_quantity / 1e6 : 0;
  return (
    <>
      <div className="flex max-h-44 flex-col gap-px overflow-auto rounded-md border border-hairline bg-hairline">
        {positions.map((p) => {
          const key = posKey(p);
          const active = key === selKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                "flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors",
                active ? "bg-panel-elev" : "bg-panel hover:bg-panel-elev/60",
              )}
            >
              <span className="flex items-center gap-2">
                <Pill tone={p.is_up ? "up" : "down"}>{p.is_up ? "Up" : "Dn"}</Pill>
                <span className="tabular text-data text-text-sec">
                  {fmtNum(p.strike / PRICE_FIXED_POINT, 0)}
                </span>
              </span>
              <span className="tabular text-data text-text-dim">
                {fmtNum(p.open_quantity / 1e6, 2)} · {fmtSignedUsd(p.unrealized_pnl / 1e6)}
              </span>
            </button>
          );
        })}
      </div>

      {pos ? (
        <>
          <div className="rounded-md border border-hairline px-3 py-1">
            <Stat label="Open size" value={`${fmtNum(openHuman, 2)} dUSDC`} />
            <Stat label="Mark value" value={`${fmtNum(markHuman, 2)} dUSDC`} tone="accent" />
            <Stat
              label="Unrealized PnL"
              value={fmtSignedUsd(pos.unrealized_pnl / 1e6)}
              tone={pos.unrealized_pnl >= 0 ? "safe" : "breach"}
            />
            <Stat label="Status" value={pos.status} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label-micro">Redeem size (dUSDC)</span>
              <button
                type="button"
                onClick={() => setRedeemInput(String(openHuman))}
                className="text-data text-text-faint hover:text-text-sec"
              >
                Max {fmtNum(openHuman, 2)}
              </button>
            </div>
            <input
              inputMode="decimal"
              placeholder={fmtNum(openHuman, 2)}
              value={redeemInput}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d*\.?\d*$/.test(v)) setRedeemInput(v);
              }}
              className="tabular w-full rounded-md border border-hairline bg-panel-elev px-3 py-2 text-md font-medium text-foreground outline-none focus:border-accent-brand/60"
            />
          </div>
          <ActionButton
            label={pending ? "Confirming…" : "Redeem position"}
            disabled={pending}
            onClick={onSell}
            note="Signs a real predict::redeem · payout lands in your account"
          />
        </>
      ) : (
        <p className="label-micro text-center text-text-faint">Select a position to redeem</p>
      )}
    </>
  );
}

function AccountTab({
  owner,
  managerId,
  pending,
  mode,
  setMode,
  input,
  setInput,
  walletHuman,
  mgrBalHuman,
  onCreate,
  onSubmit,
}: {
  owner: string | null;
  managerId: string | null;
  pending: boolean;
  mode: "deposit" | "withdraw";
  setMode: (m: "deposit" | "withdraw") => void;
  input: string;
  setInput: (v: string) => void;
  walletHuman: number;
  mgrBalHuman: number;
  onCreate: () => void;
  onSubmit: () => void;
}) {
  if (!owner) {
    return <PanelState kind="empty">Connect a wallet to manage your account</PanelState>;
  }
  if (!managerId) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-data text-text-dim">
          A PredictManager is your on-chain trading account: it holds the dUSDC
          your positions are bought from and paid into. Create one to start.
        </p>
        <ActionButton
          label={pending ? "Confirming…" : "Create trading account"}
          disabled={pending}
          onClick={onCreate}
          note="Signs a real predict::create_manager on Testnet"
        />
      </div>
    );
  }
  const amt = Number(input) || 0;
  const max = mode === "deposit" ? walletHuman : mgrBalHuman;
  const over = amt > max + 1e-9;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-hairline bg-hairline">
        {(["deposit", "withdraw"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setInput("");
            }}
            className={cn(
              "py-1.5 text-data font-medium capitalize transition-colors",
              mode === m
                ? "bg-panel-elev text-foreground"
                : "bg-panel text-text-dim hover:text-text-sec",
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="label-micro">Amount (dUSDC)</span>
          <button
            type="button"
            onClick={() => setInput(String(Math.floor(max * 1e6) / 1e6))}
            className="text-data text-text-faint tabular hover:text-text-sec"
          >
            {mode === "deposit" ? "Wallet" : "Account"} {fmtNum(max, 2)}
          </button>
        </div>
        <input
          inputMode="decimal"
          placeholder="0.00"
          value={input}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) setInput(v);
          }}
          className={cn(
            "tabular w-full rounded-md border bg-panel-elev px-3 py-2 text-md font-medium text-foreground outline-none",
            over ? "border-breach/60" : "border-hairline focus:border-accent-brand/60",
          )}
        />
      </div>
      <div className="rounded-md border border-hairline px-3 py-1">
        <Stat label="Wallet" value={`${fmtNum(walletHuman, 2)} dUSDC`} />
        <Stat label="Account balance" value={`${fmtNum(mgrBalHuman, 2)} dUSDC`} tone="accent" />
      </div>
      <ActionButton
        label={
          pending
            ? "Confirming…"
            : over
              ? "Exceeds available"
              : mode === "deposit"
                ? "Deposit dUSDC"
                : "Withdraw dUSDC"
        }
        disabled={pending || amt <= 0 || over}
        onClick={onSubmit}
        note={`Signs a real predict_manager::${mode} on Testnet`}
      />
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  note,
  tone = "accent",
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  note?: string;
  tone?: "accent" | "up" | "down";
}) {
  const bg =
    tone === "up"
      ? "bg-safe text-black hover:bg-safe/90"
      : tone === "down"
        ? "bg-breach text-white hover:bg-breach/90"
        : "bg-accent-brand text-white hover:bg-accent-brand/90";
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full rounded-md py-2 text-val font-medium transition-colors",
          bg,
          "disabled:cursor-not-allowed disabled:bg-panel-elev disabled:text-text-faint",
        )}
      >
        {label}
      </button>
      {note ? (
        <p className="label-micro mt-1.5 text-center text-text-faint">{note}</p>
      ) : null}
    </div>
  );
}

function fmtSignedUsd(n: number): string {
  return `${n >= 0 ? "+" : "−"}${fmtNum(Math.abs(n), 2)}`;
}
