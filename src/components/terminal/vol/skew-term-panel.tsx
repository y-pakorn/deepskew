"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTermStructure } from "@/lib/indexer/hooks";
import { fmtDuration, fmtPctValue, fmtSigned } from "@/lib/format";
import {
  forwardVol,
  impliedMove,
  skewMetrics,
  totalVariance,
} from "@/lib/svi";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { Curve } from "../chart/curve";
import { Hero, StatTile, TileGrid } from "../stat";
import { LabelTip } from "../label-tip";
import {
  LightCard,
  LightFigures,
  LightLede,
  LightNote,
  LightSubLabel,
  Num,
} from "../light";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";

/** 25-delta skew + ATM term structure: the surface as the numbers a trader reads
 *  first — risk reversal, butterfly, the ATM term curve, forward vol and the
 *  priced move, with a per-tenor breakdown filling the panel. */
export function SkewTermPanel({ className }: { className?: string }) {
  const { rows: term } = useTermStructure();
  const now = useNow();

  const data = useMemo(() => {
    const rows = term.map((r) => ({
      ...r,
      days: r.T * 365.25,
      wAtm: totalVariance(0, r.params),
      skew: skewMetrics(r.params, r.T),
      move: impliedMove(r.atmIV, r.T),
    }));
    const front = rows[0];
    const back = rows.at(-1);
    const fwd =
      rows.length >= 2
        ? forwardVol(rows[0].T, rows[0].wAtm, rows[1].T, rows[1].wAtm)
        : null;
    return { rows, front, back, fwd, termDir: front && back ? back.atmIV - front.atmIV : 0 };
  }, [term]);

  const { rows, front, back, fwd, termDir } = data;
  const hasCurve = rows.length >= 2;

  return (
    <Panel
      title="Skew & Term Structure"
      code="25Δ · ATM term"
      className={className}
      bodyClassName="flex flex-col gap-2 overflow-hidden 2xl:gap-3"
      light={
        front && front.skew && hasCurve ? (
          <LightCard fill>
            <LightLede>
              The market is pricing a{" "}
              <Num>±{(front.move * 100).toFixed(1)}%</Num> move by this expiry,
              leaning toward{" "}
              {front.skew.rr25 < 0 ? "downside protection" : "upside bets"}.
            </LightLede>
            <div className="flex min-h-0 flex-1 flex-col">
              <LightSubLabel tip="atm-term-curve">
                Expected move across expiries
              </LightSubLabel>
              <div className="mt-1.5 flex min-h-0 flex-1 flex-col">
                <Curve
                  className="h-full min-h-28"
                  data={rows.map((r) => ({ x: r.days, y: r.atmIV * 100 }))}
                  hoverFormat={(p) => `${p.y.toFixed(1)}%`}
                />
              </div>
            </div>
            <LightFigures
              items={[
                {
                  label: "Expected move",
                  value: `±${(front.move * 100).toFixed(1)}%`,
                  tip: "implied-move",
                },
                {
                  label: "Skew",
                  value: fmtSigned(front.skew.rr25, 1),
                  tone: front.skew.rr25 < 0 ? "warn" : "default",
                  tip: "rr25",
                },
                {
                  label: "Longer expiries",
                  value: termDir >= 0 ? "Bigger moves" : "Smaller moves",
                  tip: "atm-term-curve",
                },
              ]}
            />
            <LightNote>
              The line is the annual vol priced into each expiry;{" "}
              {termDir >= 0
                ? "rising means longer-dated bets expect bigger moves (contango)."
                : "falling means near-term bets expect bigger moves (backwardation)."}
            </LightNote>
          </LightCard>
        ) : null
      }
    >
      {!front ? (
        <PanelState kind="empty">Resolving term structure…</PanelState>
      ) : (
        <>
          {front.skew ? (
            <Hero
              label="25Δ risk reversal · vol"
              tip="rr25"
              tone={front.skew.rr25 < 0 ? "warn" : "safe"}
              value={fmtSigned(front.skew.rr25, 1)}
              sub={
                <>
                  {front.skew.rr25 < 0 ? "Put skew" : "Call skew"} · ±
                  {(front.move * 100).toFixed(1)}% by{" "}
                  {fmtDuration(front.expiry - now)} ·{" "}
                  {termDir >= 0 ? "contango" : "backwardation"}
                </>
              }
            />
          ) : null}

          {hasCurve ? (
            <div className="shrink-0">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <LabelTip k="atm-term-curve" className="label-micro">
                  ATM vol term
                </LabelTip>
                <span className="text-data tabular text-text-dim">
                  {(front.atmIV * 100).toFixed(0)}% →{" "}
                  {((back?.atmIV ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
              <Curve
                className="h-28"
                data={rows.map((r) => ({ x: r.days, y: r.atmIV * 100 }))}
                hoverFormat={(p) => `${p.y.toFixed(1)}%`}
              />
            </div>
          ) : null}

          <TileGrid cols={4} className="shrink-0">
            <StatTile
              label="RR 25Δ"
              tip="rr25"
              value={front.skew ? `${fmtSigned(front.skew.rr25, 1)}` : "—"}
              tone={front.skew && front.skew.rr25 < 0 ? "warn" : "default"}
            />
            <StatTile
              label="Fly 25Δ"
              tip="bf25"
              value={front.skew ? `${fmtSigned(front.skew.bf25, 1)}` : "—"}
            />
            <StatTile
              label="Move"
              tip="implied-move"
              value={`±${(front.move * 100).toFixed(1)}%`}
            />
            <StatTile
              label="Fwd vol"
              tip="forward-vol"
              value={fwd != null ? fmtPctValue(fwd * 100) : "—"}
              tone={fwd == null ? "dim" : "default"}
            />
          </TileGrid>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid grid-cols-[1fr_2.6rem_2.6rem_2.6rem] gap-x-2 border-b border-hairline px-0.5 pb-1">
              <LabelTip k="term-structure" className="label-micro">
                Tenor
              </LabelTip>
              <span className="label-micro text-right">ATM</span>
              <LabelTip k="rr25" className="label-micro text-right">
                RR
              </LabelTip>
              <LabelTip k="bf25" className="label-micro text-right">
                Fly
              </LabelTip>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              {rows.map((r) => (
                <div
                  key={r.oracleId}
                  className="grid grid-cols-[1fr_2.6rem_2.6rem_2.6rem] gap-x-2 border-b border-hairline/40 px-0.5 py-1 text-data tabular"
                >
                  <span className="text-text-faint">
                    {fmtDuration(r.expiry - now)}
                  </span>
                  <span className="text-right text-text-sec">
                    {(r.atmIV * 100).toFixed(0)}
                  </span>
                  <span
                    className={cn(
                      "text-right",
                      r.skew && r.skew.rr25 < 0 ? "text-warn" : "text-text-dim",
                    )}
                  >
                    {r.skew ? fmtSigned(r.skew.rr25, 1) : "—"}
                  </span>
                  <span className="text-right text-text-dim">
                    {r.skew ? fmtSigned(r.skew.bf25, 1) : "—"}
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
