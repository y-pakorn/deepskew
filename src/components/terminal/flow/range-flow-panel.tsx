"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type RangeFlowItem, useRangeFlow } from "@/lib/indexer/hooks";
import { fmtPrice, fmtUsdCompact, fromUnits, utcClock } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { Hero, StatTile, TileGrid } from "../stat";
import { LabelTip } from "../label-tip";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";

/** Range (vertical-spread) instruments — an entire product line the binary-only
 *  desk ignores. Leads with traded premium, shows where bands cluster, and the
 *  live range tape. */
export function RangeFlowPanel({ className }: { className?: string }) {
  const account = useCurrentAccount();
  const { items, mints, isLoading, isError } = useRangeFlow(80);

  const m = useMemo(() => {
    const premium = mints.reduce((s, r) => s + r.cost, 0);
    const byBand = new Map<
      string,
      { lower: number; higher: number; notional: number; count: number }
    >();
    for (const r of mints) {
      const key = `${r.lower_strike}:${r.higher_strike}`;
      const e =
        byBand.get(key) ??
        { lower: r.lower_strike, higher: r.higher_strike, notional: 0, count: 0 };
      e.notional += r.cost;
      e.count += 1;
      byBand.set(key, e);
    }
    const bands = [...byBand.values()]
      .sort((a, b) => b.notional - a.notional)
      .slice(0, 8);
    return { premium, bands, mintCount: mints.length };
  }, [mints]);

  return (
    <Panel
      title="Range flow"
      code="vertical spreads"
      className={className}
      bodyClassName="flex flex-col overflow-hidden p-0"
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
    >
      {isError ? (
        <PanelState kind="error">Range feed unreachable</PanelState>
      ) : isLoading && !items.length ? (
        <PanelState kind="empty">Loading ranges…</PanelState>
      ) : !items.length ? (
        <PanelState kind="empty">No range positions yet</PanelState>
      ) : (
        <>
          <div className="border-b border-hairline p-3">
            <Hero
              label="Range premium"
              tip="range-flow"
              tone="accent"
              value={fmtUsdCompact(fromUnits(m.premium, DUSDC_DECIMALS))}
              sub={
                <>
                  {m.mintCount} ranges · {m.bands.length} bands · vertical spreads
                </>
              }
            />
            {m.bands.length ? (
              <div className="mt-3">
                <LabelTip k="range-band" className="label-micro">
                  Band ladder · by notional
                </LabelTip>
                <BandLadder bands={m.bands} className="mt-1.5" />
              </div>
            ) : null}
            <TileGrid cols={2} className="mt-3">
              <StatTile
                label="Premium"
                tip="range-flow"
                value={fmtUsdCompact(fromUnits(m.premium, DUSDC_DECIMALS))}
              />
              <StatTile
                label="Distinct bands"
                tip="range-band"
                value={`${m.bands.length}`}
                tone="dim"
              />
            </TileGrid>
          </div>

          <div className="grid grid-cols-[2.6rem_1fr_auto] items-center gap-x-2 border-b border-hairline px-3 py-1.5">
            <span className="label-micro">Time</span>
            <LabelTip k="range-band" className="label-micro">
              Band
            </LabelTip>
            <LabelTip k="flow-amount" className="label-micro ml-auto w-fit">
              Prem/payout
            </LabelTip>
          </div>
          <ScrollArea className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)]">
            {items.map((it, i) => (
              <RangeRow
                key={`${it.digest}-${it.kind}-${i}`}
                it={it}
                mine={!!account && account.address === it.actor}
              />
            ))}
          </ScrollArea>
        </>
      )}
    </Panel>
  );
}

function RangeRow({ it, mine }: { it: RangeFlowItem; mine: boolean }) {
  const amt = fromUnits(it.amount, DUSDC_DECIMALS);
  const isRedeem = it.kind === "redeem";
  return (
    <div
      className={cn(
        "grid grid-cols-[2.6rem_1fr_auto] items-center gap-x-2 border-b border-hairline/40 px-3 py-1 text-data tabular",
        mine && "bg-accent-brand/10",
      )}
    >
      <span className="text-text-faint">
        {utcClock(new Date(it.ts))}
      </span>
      <span className="truncate text-text-sec">
        {fmtPrice(it.lower)}–{fmtPrice(it.higher)}
      </span>
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
            ? `+${fmtUsdCompact(amt)}`
            : "$0"
          : `−${fmtUsdCompact(amt)}`}
      </span>
    </div>
  );
}

/** Each top band drawn as a horizontal segment from lower→higher strike on a
 *  shared price axis; brighter = more notional. */
function BandLadder({
  bands,
  className,
}: {
  bands: { lower: number; higher: number; notional: number; count: number }[];
  className?: string;
}) {
  const lo = Math.min(...bands.map((b) => b.lower));
  const hi = Math.max(...bands.map((b) => b.higher));
  const span = hi - lo || 1;
  const maxN = Math.max(1, ...bands.map((b) => b.notional));
  const x = (v: number) => ((v - lo) / span) * 100;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {bands.map((b, i) => (
        <div key={i} className="relative h-3">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-hairline/60" />
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent-brand"
            style={{
              left: `${x(b.lower)}%`,
              width: `${Math.max(2, x(b.higher) - x(b.lower))}%`,
              opacity: 0.35 + 0.6 * (b.notional / maxN),
            }}
          />
        </div>
      ))}
      <div className="flex justify-between">
        <span className="label-micro tabular text-text-faint">{fmtPrice(lo)}</span>
        <span className="label-micro tabular text-text-faint">{fmtPrice(hi)}</span>
      </div>
    </div>
  );
}
