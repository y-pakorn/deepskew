"use client";

import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { dAppKit } from "@/lib/sui/dapp-kit";
import {
  buildSupplyTx,
  buildWithdrawTx,
  DUSDC_TYPE,
  listAllCoins,
  PLP_TYPE,
  totalBalance,
} from "@/lib/sui/tx";
import { usePredictConfig, useVaultSummary } from "@/lib/indexer/hooks";
import { DUSDC_DECIMALS, explorerTx } from "@/lib/sui/constants";
import { fmtNum, fmtPct, fmtUsdCompact, fromUnits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";
import { Pill } from "../pill";
import { Stat, Verdict } from "../stat";

type Mode = "deposit" | "withdraw";

/** A withdraw rate-limiter `available_withdrawal` this large means the limiter
 *  is disabled on-chain (it returns u64::max), so liquidity is the only bind. */
const LIMITER_OFF = 1e12;

/**
 * Provide liquidity — the one place the desk WRITES to Predict. Supplies dUSDC
 * into the PLP vault (`predict::supply` → Coin<PLP>) or withdraws by burning
 * PLP (`predict::withdraw`). It leads with the live solvency verdict so the read
 * ("is the vault safe to back?") flows straight into the action, and clamps
 * withdrawals to the live binding cap = min(available liquidity, withdrawal
 * limiter budget). Connect-gated; every fill links to its on-chain digest.
 */
export function SupplyPanel({ className }: { className?: string }) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const owner = account?.address ?? null;
  const qc = useQueryClient();

  const { data: vault, isLoading, isError } = useVaultSummary();
  const { data: config } = usePredictConfig();
  const quoteType = config?.quote_assets?.[0] ?? DUSDC_TYPE;

  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);

  // Connected balances (base units), read straight from the gRPC core client.
  const dusdc = useQuery({
    queryKey: ["balance", owner, DUSDC_TYPE],
    enabled: !!owner,
    refetchInterval: 15_000,
    queryFn: async () => {
      const r = await client.core.getBalance({ owner: owner!, coinType: DUSDC_TYPE });
      return BigInt(r.balance.balance);
    },
  });
  const plp = useQuery({
    queryKey: ["balance", owner, PLP_TYPE],
    enabled: !!owner,
    refetchInterval: 15_000,
    queryFn: async () => {
      const r = await client.core.getBalance({ owner: owner!, coinType: PLP_TYPE });
      return BigInt(r.balance.balance);
    },
  });

  const sharePrice = vault?.plp_share_price ?? 1;
  const dusdcHuman = dusdc.data != null ? Number(dusdc.data) / 1e6 : 0;
  const plpHuman = plp.data != null ? Number(plp.data) / 1e6 : 0;
  const plpValue = plpHuman * sharePrice;

  // Live withdraw cap: the smaller of the solvency floor (available liquidity)
  // and the rate-limiter budget. The limiter is a refilling throughput cap, not
  // a timed lock, so this is the amount withdrawable *right now*.
  const availLiq = vault ? fromUnits(vault.available_liquidity, DUSDC_DECIMALS) : 0;
  const availWd = vault ? fromUnits(vault.available_withdrawal, DUSDC_DECIMALS) : 0;
  const limiterOff = availWd > LIMITER_OFF;
  const withdrawCap = limiterOff ? availLiq : Math.min(availLiq, availWd);
  const maxWithdraw = Math.min(plpValue, withdrawCap);
  const maxAmount = mode === "deposit" ? dusdcHuman : maxWithdraw;

  const amountNum = Number(amount) || 0;
  const overCap = amountNum > maxAmount + 1e-9;
  const estShares = sharePrice > 0 ? amountNum / sharePrice : 0;

  // Solvency verdict — the funnel's lead. Same thresholds as the risk one-pager,
  // minus the per-expiry concentration (which needs the reconstructed book).
  const grade = useMemo(() => {
    if (!vault) return null;
    const exitRatio =
      vault.vault_value > 0 ? vault.available_withdrawal / vault.vault_value : 1;
    let s: 0 | 1 | 2 = 0;
    const bump = (x: 0 | 1 | 2) => {
      if (x > s) s = x;
    };
    if (vault.utilization > 0.9) bump(2);
    else if (vault.utilization > 0.75) bump(1);
    if (vault.max_payout_utilization > 0.9) bump(2);
    else if (vault.max_payout_utilization > 0.75) bump(1);
    if (exitRatio < 0.05) bump(2);
    else if (exitRatio < 0.15) bump(1);
    return [
      { label: "Green", tone: "safe" as const },
      { label: "Amber", tone: "warn" as const },
      { label: "Red", tone: "breach" as const },
    ][s];
  }, [vault]);

  const setPct = (pct: number) => {
    if (maxAmount > 0) setAmount(String(+(maxAmount * pct).toFixed(6)));
  };

  async function submit() {
    if (!owner || amountNum <= 0 || pending) return;
    setPending(true);
    try {
      const base = BigInt(Math.round(amountNum * 1e6));
      let tx;
      if (mode === "deposit") {
        const coins = await listAllCoins(client, owner, quoteType);
        if (totalBalance(coins) < base) throw new Error("Insufficient dUSDC balance");
        tx = buildSupplyTx({ amount: base, coins, sender: owner, quoteType });
      } else {
        const coins = await listAllCoins(client, owner, PLP_TYPE);
        const have = totalBalance(coins);
        let shares = BigInt(Math.round((amountNum / sharePrice) * 1e6));
        if (shares > have) shares = have; // never burn more PLP than held
        if (shares <= BigInt(0)) throw new Error("No PLP shares to withdraw");
        tx = buildWithdrawTx({ shares, plpCoins: coins, sender: owner, quoteType });
      }
      const res = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (res.$kind === "FailedTransaction") {
        throw new Error("Transaction failed on-chain");
      }
      const digest = res.Transaction.digest;
      toast.success(
        `${mode === "deposit" ? "Supplied" : "Withdrew"} ${fmtUsdCompact(amountNum)} dUSDC`,
        {
          description: `${digest.slice(0, 10)}…`,
          action: {
            label: "Suiscan",
            onClick: () => window.open(explorerTx(digest), "_blank", "noopener"),
          },
        },
      );
      setAmount("");
      qc.invalidateQueries({ queryKey: ["predict"] });
      qc.invalidateQueries({ queryKey: ["lp"] });
      qc.invalidateQueries({ queryKey: ["balance", owner] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel
      title="Provide Liquidity"
      code="Supply · withdraw"
      className={className}
      right={
        owner ? (
          <span className="text-data tabular text-text-dim">
            {fmtNum(mode === "deposit" ? dusdcHuman : plpValue, 2)}{" "}
            {mode === "deposit" ? "dUSDC" : "dUSDC in PLP"}
          </span>
        ) : (
          <Pill tone="neutral">Not connected</Pill>
        )
      }
    >
      {isError ? (
        <PanelState kind="error">Vault feed unreachable</PanelState>
      ) : isLoading || !vault || !grade ? (
        <PanelState kind="empty">Loading vault…</PanelState>
      ) : (
        <div className="flex flex-col gap-3">
          <Verdict tone={grade.tone} tip="risk-grade">
            Vault {grade.label}
            <span className="ml-1 font-normal text-text-dim">
              · {grade.tone === "safe" ? "safe to back" : grade.tone === "warn" ? "back with caution" : "stressed"}
            </span>
          </Verdict>

          {/* Deposit / Withdraw toggle */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-hairline bg-hairline">
            {(["deposit", "withdraw"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setAmount("");
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

          {/* Amount input */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label-micro">
                Amount {mode === "deposit" ? "(dUSDC)" : "(dUSDC out)"}
              </span>
              <span className="text-data tabular text-text-faint">
                {mode === "deposit"
                  ? `Balance ${fmtNum(dusdcHuman, 2)}`
                  : `Withdrawable ${fmtUsdCompact(maxAmount)}`}
              </span>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 rounded-md border bg-panel-elev px-3 py-2 transition-colors",
                overCap ? "border-breach/60" : "border-hairline focus-within:border-accent-brand/60",
              )}
            >
              <input
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
                }}
                disabled={!owner}
                className="tabular w-full bg-transparent text-md font-medium text-foreground tabular-nums outline-none placeholder:text-text-faint disabled:opacity-50"
              />
              <div className="flex shrink-0 gap-1">
                {[0.25, 0.5, 1].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPct(p)}
                    disabled={!owner || maxAmount <= 0}
                    className="rounded border border-hairline px-1.5 py-0.5 text-data text-text-dim transition-colors hover:border-divider hover:text-foreground disabled:opacity-40"
                  >
                    {p === 1 ? "Max" : `${p * 100}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="rounded-md border border-hairline px-3 py-1">
            <Stat
              label="PLP share price"
              tip="plp-share-price"
              value={`$${sharePrice.toFixed(4)}`}
            />
            {mode === "deposit" ? (
              <Stat
                label="You receive"
                value={`${fmtNum(estShares, 4)} PLP`}
                tone="accent"
              />
            ) : (
              <>
                <Stat label="Burns" value={`${fmtNum(estShares, 4)} PLP`} />
                <Stat
                  label="Limiter budget"
                  tip="withdrawal-limiter"
                  value={limiterOff ? "Off" : fmtUsdCompact(availWd)}
                  tone={limiterOff ? "dim" : "warn"}
                />
              </>
            )}
            <Stat
              label="Utilization"
              tip="utilization"
              value={fmtPct(vault.utilization)}
            />
          </div>

          <div className="mt-1">
            <button
              type="button"
              onClick={submit}
              disabled={!owner || amountNum <= 0 || overCap || pending}
              className={cn(
                "w-full rounded-md py-2 text-val font-medium transition-colors",
                "bg-accent-brand text-white hover:bg-accent-brand/90",
                "disabled:cursor-not-allowed disabled:bg-panel-elev disabled:text-text-faint",
              )}
            >
              {!owner
                ? "Connect a wallet to supply"
                : pending
                  ? "Confirming…"
                  : overCap
                    ? "Exceeds available"
                    : mode === "deposit"
                      ? "Supply dUSDC"
                      : "Withdraw dUSDC"}
            </button>
            {owner ? (
              <p className="label-micro mt-1.5 text-center text-text-faint">
                Signs a real {mode === "deposit" ? "predict::supply" : "predict::withdraw"} on testnet
              </p>
            ) : null}
          </div>
        </div>
      )}
    </Panel>
  );
}
