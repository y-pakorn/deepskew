"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type FlowItem,
  useRecentFlow,
  useSettlementStats,
} from "@/lib/indexer/hooks";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { fmtPrice, fmtUsdCompact, fromUnits, utcClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

export function DeskPanel({ className }: { className?: string }) {
  const account = useCurrentAccount();
  const { items, isLoading, isError } = useRecentFlow(80);

  const mints = items.filter((i) => i.kind === "mint");
  const upCount = mints.filter((m) => m.isUp).length;
  const upPct = mints.length ? (upCount / mints.length) * 100 : 50;
  const volume = mints.reduce((s, m) => s + m.amount, 0);
  const stats = useSettlementStats();

  return (
    <Panel
      title="DESK"
      code="live flow · settle"
      className={className}
      right={
        <span className="label-micro text-text-faint">
          {items.length ? `${items.length} events` : "live"}
        </span>
      }
      bodyClassName="flex flex-col overflow-hidden p-0"
    >
      {items.length ? (
        <div className="border-b border-hairline px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="label-micro">positioning · last {mints.length}</span>
            <span className="font-mono text-[11px] tabular text-text-dim">
              vol {fmtUsdCompact(fromUnits(volume, DUSDC_DECIMALS))}
            </span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-breach/30">
            <div className="h-full bg-safe" style={{ width: `${upPct}%` }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] tabular">
            <span className="text-safe">{upPct.toFixed(0)}% UP</span>
            <span className="text-breach">{(100 - upPct).toFixed(0)}% DN</span>
          </div>
        </div>
      ) : null}

      {stats.total ? (
        <div className="border-b border-hairline px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="label-micro">settlement · {stats.total}</span>
            <span className="font-mono text-[11px] tabular text-text-dim">
              payouts {fmtUsdCompact(fromUnits(stats.payouts, DUSDC_DECIMALS))}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[11px] tabular">
            <span className="text-text-sec">
              taker win{" "}
              <span
                className={stats.winRate < 50 ? "text-safe" : "text-warn"}
                title="< 50% means the PLP vault has an edge"
              >
                {stats.winRate.toFixed(0)}%
              </span>
            </span>
            <span className="text-text-faint">
              UP {stats.upWinRate.toFixed(0)}% · DN {stats.dnWinRate.toFixed(0)}%
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-[3.6rem_2rem_1fr_auto] items-center gap-x-2 border-b border-hairline px-3 py-1.5">
        <span className="label-micro">time</span>
        <span className="label-micro">side</span>
        <span className="label-micro">strike</span>
        <span className="label-micro text-right">prem/payout</span>
      </div>

      {isError ? (
        <p className="label-micro p-3 text-breach">flow feed unreachable</p>
      ) : isLoading && !items.length ? (
        <div className="space-y-1.5 p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full bg-panel-elev" />
          ))}
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div>
            {items.map((it) => (
              <FlowRow
                key={`${it.digest}-${it.kind}`}
                it={it}
                mine={!!account && account.address === it.actor}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </Panel>
  );
}

function FlowRow({ it, mine }: { it: FlowItem; mine: boolean }) {
  const amt = fromUnits(it.amount, DUSDC_DECIMALS);
  const isRedeem = it.kind === "redeem";
  return (
    <div
      className={cn(
        "grid grid-cols-[3.6rem_2rem_1fr_auto] items-center gap-x-2 border-b border-hairline/40 px-3 py-1 font-mono text-[11px] tabular",
        mine && "bg-accent-brand/10",
      )}
    >
      <span className="text-text-faint">{utcClock(new Date(it.ts))}</span>
      <span className={it.isUp ? "text-safe" : "text-breach"}>
        {it.isUp ? "UP▲" : "DN▼"}
      </span>
      <span className="truncate text-text-sec">{fmtPrice(it.strike)}</span>
      <span
        className={cn(
          "text-right",
          isRedeem
            ? amt > 0
              ? "text-safe"
              : "text-text-faint"
            : "text-text-dim",
        )}
      >
        {isRedeem
          ? amt > 0
            ? `+$${amt.toFixed(2)}`
            : "$0.00"
          : `−$${amt.toFixed(2)}`}
      </span>
    </div>
  );
}
