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
import { LabelTip } from "./label-tip";
import { Panel } from "./panel";
import { PanelState } from "./panel-state";

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
      title="Desk"
      code="live flow · settle"
      className={className}
      right={
        <span className="label-micro text-text-faint">
          {items.length ? (
            <>
              <span className="tabular">{items.length}</span> events
            </>
          ) : (
            "Live"
          )}
        </span>
      }
      bodyClassName="flex flex-col overflow-hidden p-0"
    >
      {items.length ? (
        <div className="border-b border-hairline px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <LabelTip k="positioning" className="label-micro min-w-0 truncate">
              Positioning · last{" "}
              <span className="tabular">{mints.length}</span>
            </LabelTip>
            <span className="shrink-0 whitespace-nowrap text-data tabular text-text-dim">
              <LabelTip k="vol-premium">Vol</LabelTip>{" "}
              {fmtUsdCompact(fromUnits(volume, DUSDC_DECIMALS))}
            </span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-breach/30">
            <div className="h-full bg-safe" style={{ width: `${upPct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-data tabular">
            <span className="text-safe">{upPct.toFixed(0)}% UP</span>
            <span className="text-breach">{(100 - upPct).toFixed(0)}% DN</span>
          </div>
        </div>
      ) : null}

      {stats.total ? (
        <div className="border-b border-hairline px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <LabelTip k="settlement-count" className="label-micro min-w-0 truncate">
              Settlement · <span className="tabular">{stats.total}</span>
            </LabelTip>
            <span className="shrink-0 whitespace-nowrap text-data tabular text-text-dim">
              <LabelTip k="payouts">Payouts</LabelTip>{" "}
              {fmtUsdCompact(fromUnits(stats.payouts, DUSDC_DECIMALS))}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-data tabular">
            <span className="shrink-0 whitespace-nowrap text-text-sec">
              <LabelTip k="taker-win">Taker win</LabelTip>{" "}
              <span
                className={stats.winRate < 50 ? "text-safe" : "text-warn"}
                title="< 50% means the PLP vault has an edge"
              >
                {stats.winRate.toFixed(0)}%
              </span>
            </span>
            <LabelTip k="updn-win-split" className="min-w-0 truncate text-right text-text-faint">
              UP {stats.upWinRate.toFixed(0)}% · DN {stats.dnWinRate.toFixed(0)}%
            </LabelTip>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-[3.9rem_2rem_1fr_auto] items-center gap-x-2 border-b border-hairline px-3 py-1.5">
        <span className="label-micro">Time</span>
        <span className="label-micro">Side</span>
        <span className="label-micro">Strike</span>
        <LabelTip k="flow-columns" className="label-micro text-right">Prem/payout</LabelTip>
      </div>

      {isError ? (
        <PanelState kind="error">Flow feed unreachable</PanelState>
      ) : isLoading && !items.length ? (
        <div className="px-3 py-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[3.9rem_2rem_1fr_auto] items-center gap-x-2 py-1"
            >
              <Skeleton className="h-3 w-12 bg-panel-elev" />
              <Skeleton className="h-3 w-6 bg-panel-elev" />
              <Skeleton className="h-3 w-16 bg-panel-elev" />
              <Skeleton className="h-3 w-12 justify-self-end bg-panel-elev" />
            </div>
          ))}
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)]">
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
        "grid grid-cols-[3.9rem_2rem_1fr_auto] items-center gap-x-2 border-b border-hairline/40 px-3 py-1 text-data tabular",
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
