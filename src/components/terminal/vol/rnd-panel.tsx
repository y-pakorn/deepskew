"use client";

import { useMemo } from "react";
import { useOracleState } from "@/lib/indexer/hooks";
import { fmtPctValue, fmtSigned } from "@/lib/format";
import {
  checkButterfly,
  decodeSvi,
  digitalUpProb,
  riskNeutralDensity,
  rndStats,
  totalVariance,
  yearsToExpiry,
  type SviParams,
} from "@/lib/svi";
import { cn } from "@/lib/utils";
import { Curve, type CurveMarker } from "../chart/curve";
import { Hero } from "../stat";
import { LabelTip } from "../label-tip";
import { useMarket } from "../market-context";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";
import { Pill } from "../pill";

const movePct = (k: number) => (Math.exp(k) - 1) * 100;
const MOVES = [-10, -5, -2, -1, 1, 2, 5, 10];

/** Risk-neutral density implied by the selected expiry's SVI slice
 *  (Breeden–Litzenberger via Gatheral): the full distribution the smile prices,
 *  with the butterfly check shown as density-non-negativity and a digital-price
 *  ladder of P(finish above) at each move. */
export function RndPanel({ className }: { className?: string }) {
  const { selectedOracleId } = useMarket();
  const { data: state, isLoading, isError } = useOracleState(selectedOracleId);

  const model = useMemo(() => {
    const svi = state?.latest_svi;
    if (!state || !svi) return null;
    const p = decodeSvi(svi);
    const T = yearsToExpiry(state.oracle.expiry, svi.checkpoint_timestamp_ms);
    if (state.oracle.status === "settled" || T <= 0)
      return { settled: true as const };
    // Adaptive window: ±4σ of the realised move so the density fills the chart
    // instead of spiking for short expiries.
    const sigmaT = Math.sqrt(Math.max(1e-6, totalVariance(0, p)));
    const kr = Math.min(1.2, Math.max(0.08, 4 * sigmaT));
    const pts = riskNeutralDensity(p, { kMin: -kr, kMax: kr, steps: 160 });
    return {
      settled: false as const,
      p,
      pts,
      stats: rndStats(pts),
      bf: checkButterfly(p),
    };
  }, [state]);

  const tail =
    model && !model.settled && model.stats
      ? model.stats.q90 + model.stats.q10 < -0.002
        ? { label: "Fat left tail", tone: "warn" as const }
        : model.stats.q90 + model.stats.q10 > 0.002
          ? { label: "Fat right tail", tone: "safe" as const }
          : { label: "Symmetric", tone: "default" as const }
      : null;

  return (
    <Panel
      title="Risk-Neutral Density"
      code="Breeden–Litzenberger"
      className={className}
      bodyClassName="flex flex-col gap-2 overflow-hidden 2xl:gap-3"
      right={
        model && !model.settled ? (
          <Pill tone={model.bf.minG >= 0 ? "up" : "down"} tip="density-nonneg">
            {model.bf.minG >= 0 ? "q(k) ≥ 0 ✓" : "q(k) < 0 ✕"}
          </Pill>
        ) : null
      }
    >
      {!selectedOracleId ? (
        <PanelState kind="empty">No active market</PanelState>
      ) : isError ? (
        <PanelState kind="error">Density feed unreachable</PanelState>
      ) : isLoading || !model ? (
        <PanelState kind="empty">Resolving density…</PanelState>
      ) : model.settled || !model.stats ? (
        <PanelState kind="empty">Expiry settled — no live density</PanelState>
      ) : (
        <>
          <Hero
            label="Modal move vs forward"
            tip="rnd-mode"
            tone={tail?.tone ?? "default"}
            value={`${fmtSigned(model.stats.modeMove * 100, 1)}%`}
            sub={
              <>
                {tail?.label ?? "—"} · P(up){" "}
                {fmtPctValue(model.stats.pUp * 100)} · 10–90%{" "}
                {fmtSigned(model.stats.q10 * 100, 1)}…
                {fmtSigned(model.stats.q90 * 100, 1)}%
              </>
            }
          />

          <Curve
            className="h-36 shrink-0"
            data={model.pts.map((d) => ({ x: d.k, y: d.q }))}
            baseline={0}
            markers={[
              { x: 0, label: "F", dashed: true },
              {
                x: model.stats.modeK,
                label: "mode",
                color: "var(--accent-brand)",
                dashed: false,
              } satisfies CurveMarker,
            ]}
            hoverFormat={(p) =>
              `${p.x >= 0 ? "+" : ""}${movePct(p.x).toFixed(1)}%`
            }
          />

          <ProbabilityLadder p={model.p} className="min-h-0 flex-1" />
        </>
      )}
    </Panel>
  );
}

/** P(finish above) at a ladder of moves — the smile as a strip of digital prices. */
function ProbabilityLadder({
  p,
  className,
}: {
  p: SviParams;
  className?: string;
}) {
  const rows = MOVES.map((mv) => {
    const k = Math.log(1 + mv / 100);
    return { mv, pAbove: digitalUpProb(k, p) };
  });
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-1 flex items-center justify-between">
        <LabelTip k="rnd-pup" className="label-micro">
          P(finish above)
        </LabelTip>
        <span className="label-micro text-text-faint">By move</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-px">
        {rows.map((r) => (
          <div
            key={r.mv}
            className="grid grid-cols-[2.8rem_1fr_2.6rem] items-center gap-2 text-data tabular"
          >
            <span className={r.mv >= 0 ? "text-safe" : "text-breach"}>
              {r.mv >= 0 ? "+" : "−"}
              {Math.abs(r.mv)}%
            </span>
            <div className="h-1.5 overflow-hidden rounded-full bg-panel-elev">
              <div
                className="h-full rounded-full bg-accent-brand/70"
                style={{ width: `${r.pAbove * 100}%` }}
              />
            </div>
            <span className="text-right text-text-sec">
              {(r.pAbove * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
