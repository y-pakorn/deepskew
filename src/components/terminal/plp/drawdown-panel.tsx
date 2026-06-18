"use client";

import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVaultPerformance } from "@/lib/indexer/hooks";
import { fmtPctValue, fmtUsdCompact, fromUnits } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { Curve } from "../chart/curve";
import { LightCard, LightFigures, LightLede, LightNote, Num } from "../light";
import { Hero, StatTile, TileGrid } from "../stat";
import { LabelTip } from "../label-tip";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";

const RANGES = ["1D", "1W", "1M", "3M", "ALL"] as const;
const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

/** PLP share price as an underwater (drawdown) curve — the standard way LPs
 *  evaluate a vault — plus the share-price history table. */
export function DrawdownPanel({ className }: { className?: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("ALL");
  const { data, isLoading, isError } = useVaultPerformance(undefined, range);

  const m = useMemo(() => {
    const pts = [...(data?.points ?? [])].sort(
      (a, b) => a.timestamp_ms - b.timestamp_ms,
    );
    if (pts.length < 2) return null;
    let peak = pts[0].share_price;
    const under: { x: number; y: number }[] = [];
    const table: { ts: number; share: number; dd: number }[] = [];
    for (const p of pts) {
      if (p.share_price > peak) peak = p.share_price;
      const dd = (p.share_price / peak - 1) * 100;
      under.push({ x: p.timestamp_ms, y: dd });
      table.push({ ts: p.timestamp_ms, share: p.share_price, dd });
    }
    const maxDD = Math.min(...under.map((u) => u.y));
    const first = pts[0];
    const last = pts[pts.length - 1];
    const years = (last.timestamp_ms - first.timestamp_ms) / MS_PER_YEAR;
    const apy =
      years > 0 && first.share_price > 0
        ? (last.share_price / first.share_price - 1) / years
        : null;
    const rets: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i - 1].share_price > 0)
        rets.push(Math.log(pts[i].share_price / pts[i - 1].share_price));
    }
    let vol: number | null = null;
    if (rets.length >= 2 && years > 0) {
      const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
      const variance =
        rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
      vol = Math.sqrt(variance) * Math.sqrt(rets.length / years);
    }
    return {
      under,
      table: table.reverse(),
      maxDD,
      apy,
      vol,
      tvl: last.vault_value,
    };
  }, [data]);

  return (
    <Panel
      title="Drawdown Replay"
      code="PLP underwater"
      className={className}
      bodyClassName="flex flex-col gap-2 overflow-hidden 2xl:gap-3"
      light={
        !isError && m ? (
          <LightCard fill>
            <LightLede>
              The worst dip so far is down{" "}
              <Num tone="breach">{m.maxDD.toFixed(1)}%</Num>, and the pool has
              earned about{" "}
              {m.apy != null ? (
                <Num tone={m.apy >= 0 ? "safe" : "breach"}>
                  {fmtPctValue(m.apy * 100)}
                </Num>
              ) : (
                <Num>—</Num>
              )}{" "}
              a year.
            </LightLede>
            <div className="flex min-h-0 flex-1 flex-col">
              <Curve
                className="h-full min-h-0 flex-1"
                baseline={0}
                color="var(--breach)"
                data={m.under}
                hoverFormat={(p) => `${p.y.toFixed(2)}%`}
              />
            </div>
            <LightFigures
              items={[
                {
                  label: "Worst dip",
                  value: `${m.maxDD.toFixed(1)}%`,
                  tone: "breach",
                  tip: "max-drawdown",
                },
                {
                  label: "Yearly return",
                  value: m.apy != null ? fmtPctValue(m.apy * 100) : "—",
                  tip: "apy",
                },
                {
                  label: "Pool size",
                  value: fmtUsdCompact(fromUnits(m.tvl, DUSDC_DECIMALS)),
                  tip: "vault-value",
                },
              ]}
            />
            <LightNote>
              The line tracks how far the pool sits below its best-ever value:
              the lowest point is the biggest loss from a peak, the standard way
              LPs judge a vault.
            </LightNote>
          </LightCard>
        ) : null
      }
      right={
        <div className="flex items-center gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded px-1.5 py-0.5 text-data tabular transition-colors",
                r === range
                  ? "bg-panel-elev text-foreground"
                  : "text-text-faint hover:text-text-dim",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      {isError ? (
        <PanelState kind="error">Performance feed unreachable</PanelState>
      ) : isLoading && !m ? (
        <PanelState kind="empty">Loading history…</PanelState>
      ) : !m ? (
        <PanelState kind="empty">Not enough history in range</PanelState>
      ) : (
        <>
          <Hero
            label="Max drawdown"
            tip="max-drawdown"
            tone={m.maxDD <= -5 ? "warn" : m.maxDD < 0 ? "default" : "safe"}
            value={`${m.maxDD.toFixed(1)}%`}
            sub={
              <>
                Over {range} · APY{" "}
                {m.apy != null ? fmtPctValue(m.apy * 100) : "—"} · TVL{" "}
                {fmtUsdCompact(fromUnits(m.tvl, DUSDC_DECIMALS))}
              </>
            }
          />

          <Curve
            className="h-28 shrink-0"
            baseline={0}
            color="var(--breach)"
            data={m.under}
            hoverFormat={(p) => `${p.y.toFixed(2)}%`}
          />

          <TileGrid cols={3} className="shrink-0">
            <StatTile
              label="Max DD"
              tip="max-drawdown"
              value={`${m.maxDD.toFixed(1)}%`}
              tone={m.maxDD < 0 ? "warn" : "safe"}
            />
            <StatTile
              label="APY"
              tip="apy"
              value={m.apy != null ? fmtPctValue(m.apy * 100) : "—"}
              tone={m.apy != null && m.apy >= 0 ? "safe" : "dim"}
            />
            <StatTile
              label="LP vol"
              tip="lp-vol"
              value={m.vol != null ? fmtPctValue(m.vol * 100) : "—"}
            />
          </TileGrid>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid grid-cols-[1fr_5rem_3.4rem] gap-x-2 border-b border-hairline px-0.5 pb-1">
              <span className="label-micro">Time</span>
              <LabelTip k="plp-share-price" className="label-micro text-right">
                Share
              </LabelTip>
              <span className="label-micro text-right">DD</span>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              {m.table.map((r) => (
                <div
                  key={r.ts}
                  className="grid grid-cols-[1fr_5rem_3.4rem] gap-x-2 border-b border-hairline/40 px-0.5 py-1 text-data tabular"
                >
                  <span className="text-text-faint">
                    {new Date(r.ts).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                  <span className="text-right text-text-sec">
                    {r.share.toFixed(4)}
                  </span>
                  <span
                    className={cn(
                      "text-right",
                      r.dd < 0 ? "text-breach" : "text-text-dim",
                    )}
                  >
                    {r.dd.toFixed(1)}
                  </span>
                </div>
              ))}
            </ScrollArea>
          </div>
        </>
      )}
    </Panel>
  );
}
