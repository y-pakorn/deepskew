"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  useAccount,
  useBookFlow,
  useManagerCohort,
  useManagers,
  useManagerSummary,
} from "@/lib/indexer/hooks";
import { fmtUsdCompact, fromUnits } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { LabelTip } from "../label-tip";
import { MonoValue } from "../stat";

const u = (n: number) => fromUnits(n, DUSDC_DECIMALS);
const signedUsd = (n: number) =>
  `${n >= 0 ? "+" : "−"}${fmtUsdCompact(Math.abs(u(n)))}`;

/** Compact market-wide manager strip above the leaderboard table, plus a link
 *  to the connected wallet's own account. */
export function MarketHeader() {
  const { data: directory = [] } = useManagers();
  const { mints, redeems } = useBookFlow(1000);
  const { rows: cohort } = useManagerCohort();
  const account = useCurrentAccount();
  const { managerIds } = useAccount();
  const myId = managerIds[0] ?? null;
  const { data: mySummary } = useManagerSummary(myId);

  const m = useMemo(() => {
    const volume = mints.reduce((s, x) => s + x.cost, 0);
    const payouts = redeems
      .filter((r) => r.is_settled)
      .reduce((s, r) => s + r.payout, 0);
    return {
      total: directory.length,
      active: cohort.length, // same definition as the leaderboard footer
      volume,
      vaultNet: volume - payouts,
    };
  }, [directory, mints, redeems, cohort]);

  const myTotal = mySummary
    ? mySummary.realized_pnl + mySummary.unrealized_pnl
    : null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-7 gap-y-2 border-b border-hairline bg-panel px-4 py-2.5">
      <HItem k="manager-market" label="Desks" value={`${m.total}`} />
      <HItem
        k="manager-market"
        label="Active"
        value={`${m.active}`}
        tone="text-safe"
      />
      <HItem k="vol-premium" label="Premium" value={fmtUsdCompact(u(m.volume))} />
      <HItem
        k="vol-risk-premium"
        label="Vault net"
        value={fmtUsdCompact(u(m.vaultNet))}
        tone={m.vaultNet >= 0 ? "text-safe" : "text-breach"}
      />
      <div className="ml-auto flex items-center">
        {!account ? (
          <span className="label-micro text-text-faint">
            Connect a wallet to see your account
          </span>
        ) : myId ? (
          <Link
            href={`/managers/${myId}`}
            className="flex items-center gap-2 rounded-md border border-hairline px-3 py-1.5 transition-colors hover:border-divider hover:bg-panel-elev/50"
          >
            <span className="label-micro">My account</span>
            {myTotal != null ? (
              <span
                className={cn(
                  "text-val tabular font-medium",
                  myTotal >= 0 ? "text-safe" : "text-breach",
                )}
              >
                {signedUsd(myTotal)}
              </span>
            ) : null}
            <span className="text-text-dim">→</span>
          </Link>
        ) : (
          <span className="label-micro text-text-faint">
            No Predict account for this wallet
          </span>
        )}
      </div>
    </div>
  );
}

function HItem({
  k,
  label,
  value,
  tone,
}: {
  k: string;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <LabelTip k={k} className="label-micro">
        {label}
      </LabelTip>
      <MonoValue className={cn("text-lead font-medium leading-none", tone)}>
        {value}
      </MonoValue>
    </div>
  );
}
