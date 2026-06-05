"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { digitalEdge, type EdgeRow } from "@/lib/analytics";
import { useActiveOracleMarks, useBookFlow } from "@/lib/indexer/hooks";
import { fmtSigned, fmtUsdCompact, fromUnits } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { Hero, StatTile, TileGrid } from "../stat";
import { LabelTip } from "../label-tip";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";

/**
 * Digital Edge Tape — scores every live binary mint against the model-fair price
 * the SVI smile implies (Φ(d₂)), in the protocol's own probability units. The
 * premium-weighted mean edge is the vol-risk-premium the vault is harvesting.
 */
export function EdgeTapePanel({ className }: { className?: string }) {
  const account = useCurrentAccount();
  const { mints, isLoading, isError } = useBookFlow(500);
  const { marks, priced } = useActiveOracleMarks();

  const edge = useMemo(() => digitalEdge(mints, marks), [mints, marks]);
  const ready = priced > 0 && edge.count > 0;

  return (
    <Panel
      title="Digital edge tape"
      code="fair N(d₂) vs paid"
      className={className}
      bodyClassName="flex flex-col overflow-hidden p-0"
      right={
        <span className="label-micro text-text-faint">
          {edge.count ? (
            <>
              <span className="tabular">{edge.count}</span> fills
            </>
          ) : (
            "Live"
          )}
        </span>
      }
    >
      {isError ? (
        <PanelState kind="error">Flow feed unreachable</PanelState>
      ) : isLoading && !mints.length ? (
        <PanelState kind="empty">Loading fills…</PanelState>
      ) : !ready ? (
        <PanelState kind="empty">
          {priced === 0 ? "Pricing surface…" : "No live fills to mark"}
        </PanelState>
      ) : (
        <>
          <div className="border-b border-hairline p-3">
            <Hero
              label="Vault edge / fill"
              tip="edge-bps"
              tone={edge.meanEdgeBps >= 0 ? "safe" : "breach"}
              value={`${fmtSigned(edge.meanEdgeBps, 0)} bps`}
              sub={
                <>
                  cum{" "}
                  {fmtUsdCompact(fromUnits(edge.cumDollar, DUSDC_DECIMALS))} ·
                  takers overpay {(edge.overpayRate * 100).toFixed(0)}% ·{" "}
                  {edge.count} fills
                </>
              }
            />
            <LabelTip
              k="edge-scatter"
              className="label-micro mt-3 block w-fit"
            >
              Paid vs model-fair · per fill
            </LabelTip>
            <EdgeScatter rows={edge.rows} className="mt-1" />
            <TileGrid cols={3} className="mt-3">
              <StatTile
                label="Cum edge"
                tip="vol-risk-premium"
                value={fmtUsdCompact(fromUnits(edge.cumDollar, DUSDC_DECIMALS))}
                tone={edge.cumDollar >= 0 ? "safe" : "breach"}
              />
              <StatTile
                label="Overpay"
                tip="overpay-rate"
                value={`${(edge.overpayRate * 100).toFixed(0)}%`}
              />
              <StatTile label="Fills" tip="edge-fills" value={`${edge.count}`} />
            </TileGrid>
          </div>

          <div className="grid grid-cols-[2.6rem_1fr_3rem_3rem_auto] items-center gap-x-2 border-b border-hairline px-3 py-1.5">
            <span className="label-micro">Side</span>
            <LabelTip k="moneyness-readout" className="label-micro">
              Mny
            </LabelTip>
            <LabelTip k="edge-bps" className="label-micro ml-auto w-fit">
              Fair
            </LabelTip>
            <LabelTip k="edge-bps" className="label-micro ml-auto w-fit">
              Paid
            </LabelTip>
            <LabelTip k="edge-bps" className="label-micro ml-auto w-fit">
              Edge
            </LabelTip>
          </div>
          <ScrollArea className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)]">
            {edge.rows.map((r, i) => (
              <EdgeRowView
                key={`${r.digest}:${i}`}
                r={r}
                mine={!!account && account.address === r.trader}
              />
            ))}
          </ScrollArea>
        </>
      )}
    </Panel>
  );
}

function EdgeRowView({ r, mine }: { r: EdgeRow; mine: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[2.6rem_1fr_3rem_3rem_auto] items-center gap-x-2 border-b border-hairline/40 px-3 py-1 text-data tabular",
        mine && "bg-accent-brand/10",
      )}
    >
      <span className={r.isUp ? "text-safe" : "text-breach"}>
        {r.isUp ? "UP▲" : "DN▼"}
      </span>
      <span className="truncate text-text-faint">
        {r.moneyness >= 0 ? "+" : "−"}
        {(Math.abs(r.moneyness) * 100).toFixed(1)}%
      </span>
      <span className="text-right text-text-sec">{(r.fair * 100).toFixed(0)}</span>
      <span className="text-right text-text-dim">{(r.paid * 100).toFixed(0)}</span>
      <span className={cn("text-right", r.edge >= 0 ? "text-safe" : "text-breach")}>
        {fmtSigned(r.edgeBps, 0)}
      </span>
    </div>
  );
}

/** paid (x) vs model-fair (y), with the y=x diagonal. Points below the diagonal
 *  (paid > fair) are vault edge (green); above it the taker got it cheap (red). */
function EdgeScatter({ rows, className }: { rows: EdgeRow[]; className?: string }) {
  const maxQty = Math.max(1, ...rows.map((r) => r.qty));
  return (
    <div className={cn("relative h-28 w-full", className)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <line
          x1="0"
          y1="100"
          x2="100"
          y2="0"
          stroke="var(--divider)"
          strokeWidth="0.7"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
        {rows.map((r, i) => {
          const cx = Math.max(0, Math.min(1, r.paid)) * 100;
          const cy = 100 - Math.max(0, Math.min(1, r.fair)) * 100;
          const rad = 0.9 + 2.4 * Math.sqrt(r.qty / maxQty);
          return (
            <circle
              key={`${r.digest}:${i}`}
              cx={cx}
              cy={cy}
              r={rad}
              fill={
                r.edge >= 0
                  ? "color-mix(in srgb, var(--safe) 75%, transparent)"
                  : "color-mix(in srgb, var(--breach) 75%, transparent)"
              }
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <span className="label-micro pointer-events-none absolute top-0.5 left-1 text-text-faint">
        fair ↑
      </span>
      <span className="label-micro pointer-events-none absolute right-1 bottom-0.5 text-text-faint">
        paid →
      </span>
    </div>
  );
}
