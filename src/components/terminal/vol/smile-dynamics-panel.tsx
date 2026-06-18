"use client";

import { useMemo } from "react";
import { useOracleState, useSviHistory } from "@/lib/indexer/hooks";
import { fmtSigned } from "@/lib/format";
import { decodeSvi, skewMetrics, yearsToExpiry } from "@/lib/svi";
import { Curve } from "../chart/curve";
import { LightCard, LightFigures, LightLede, LightNote, Num } from "../light";
import { Hero, StatTile, TileGrid } from "../stat";
import { LabelTip } from "../label-tip";
import { useMarket } from "../market-context";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";
import { Sparkline } from "../sparkline";

interface DynRow {
  ts: number;
  rho: number;
  b: number;
  sigma: number;
  atm: number | null;
  rr: number | null;
  bf: number | null;
}

/** How the smile is moving over time: the risk-reversal trajectory (is the desk
 *  re-skewing?) and the underlying SVI parameter drift. No raw data dump. */
export function SmileDynamicsPanel({ className }: { className?: string }) {
  const { selectedOracleId } = useMarket();
  const { data: state } = useOracleState(selectedOracleId);
  const { data: history = [], isLoading, isError } =
    useSviHistory(selectedOracleId);

  const model = useMemo(() => {
    const expiry = state?.oracle.expiry;
    if (expiry == null || history.length < 2) return null;
    const rows: DynRow[] = history.map((s) => {
      const p = decodeSvi(s);
      const T = yearsToExpiry(expiry, s.checkpoint_timestamp_ms);
      const sk = T > 0 ? skewMetrics(p, T) : null;
      return {
        ts: s.checkpoint_timestamp_ms,
        rho: p.rho,
        b: p.b,
        sigma: p.sigma,
        atm: sk?.atmIV ?? null,
        rr: sk?.rr25 ?? null,
        bf: sk?.bf25 ?? null,
      };
    });
    const withRr = rows.filter((r) => r.rr != null) as (DynRow & {
      rr: number;
    })[];
    let slope = 0;
    if (withRr.length >= 2) {
      const a = withRr[0];
      const z = withRr[withRr.length - 1];
      const hours = (z.ts - a.ts) / 3_600_000;
      if (hours > 0) slope = (z.rr - a.rr) / hours;
    }
    const last = rows[rows.length - 1];
    return { rows, withRr, slope, last };
  }, [history, state]);

  const verdict =
    model && Math.abs(model.slope) > 0.5
      ? model.slope < 0
        ? { label: "Steepening puts", tone: "warn" as const }
        : { label: "Steepening calls", tone: "safe" as const }
      : { label: "Stable skew", tone: "default" as const };

  return (
    <Panel
      title="Smile Dynamics"
      code="SVI trajectory"
      className={className}
      bodyClassName="flex flex-col gap-2 overflow-hidden 2xl:gap-3"
      light={
        selectedOracleId &&
        !isError &&
        !isLoading &&
        model &&
        model.withRr.length >= 2 ? (
          <LightCard fill>
            <LightLede>
              {Math.abs(model.slope) > 0.5 ? (
                <>
                  The crash-vs-rally lean is shifting fast right now, by about{" "}
                  <Num>{fmtSigned(model.slope, 1)}</Num> vol points an hour, so
                  traders are repricing crash risk.
                </>
              ) : (
                <>
                  The crash-vs-rally lean is holding steady, drifting only{" "}
                  <Num>{fmtSigned(model.slope, 1)}</Num> vol points an hour, so
                  pricing of crash risk is calm.
                </>
              )}
            </LightLede>
            <div className="flex min-h-0 flex-1 flex-col">
              <Curve
                className="h-full min-h-[80px]"
                fill={false}
                baseline={0}
                color="var(--warn)"
                data={model.withRr.map((r) => ({ x: r.ts, y: r.rr }))}
                hoverFormat={(p) => `${fmtSigned(p.y, 1)} vol`}
              />
            </div>
            <LightFigures
              items={[
                {
                  label: "Shift speed / hr",
                  value: fmtSigned(model.slope, 1),
                  tip: "skew-rotation",
                },
                {
                  label: "Current lean",
                  value:
                    model.last.rr != null ? fmtSigned(model.last.rr, 1) : "—",
                  tip: "rr25",
                },
                {
                  label: "Annual vol",
                  value:
                    model.last.atm != null
                      ? `${model.last.atm.toFixed(0)}%`
                      : "—",
                  tip: "atm-iv",
                },
              ]}
            />
            <LightNote>
              When this line moves, traders are repricing crash versus rally risk
              in real time; below zero means they pay more for downside
              protection.
            </LightNote>
          </LightCard>
        ) : null
      }
    >
      {!selectedOracleId ? (
        <PanelState kind="empty">No active market</PanelState>
      ) : isError ? (
        <PanelState kind="error">History feed unreachable</PanelState>
      ) : isLoading || !model ? (
        <PanelState kind="empty">
          {isLoading ? "Loading history…" : "Not enough history yet"}
        </PanelState>
      ) : (
        <>
          <Hero
            label="Skew rotation · vol pts / hr"
            tip="skew-rotation"
            tone={verdict.tone}
            value={fmtSigned(model.slope, 1)}
            sub={
              <>
                {verdict.label} · over{" "}
                <span className="tabular">{model.withRr.length}</span> SVI updates
              </>
            }
          />

          <TileGrid cols={3} className="shrink-0">
            <StatTile
              label="ATM IV"
              tip="atm-iv"
              value={
                model.last.atm != null ? `${model.last.atm.toFixed(0)}%` : "—"
              }
            />
            <StatTile
              label="RR 25Δ"
              tip="rr25"
              value={model.last.rr != null ? fmtSigned(model.last.rr, 1) : "—"}
              tone={
                model.last.rr != null && model.last.rr < 0 ? "warn" : "default"
              }
            />
            <StatTile
              label="Fly 25Δ"
              tip="bf25"
              value={model.last.bf != null ? fmtSigned(model.last.bf, 1) : "—"}
            />
          </TileGrid>

          {model.withRr.length >= 2 ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <LabelTip k="skew-rotation" className="label-micro">
                Risk reversal over time
              </LabelTip>
              <div className="mt-1 min-h-0 flex-1">
                <Curve
                  className="h-full min-h-[80px]"
                  fill={false}
                  baseline={0}
                  color="var(--warn)"
                  data={model.withRr.map((r) => ({ x: r.ts, y: r.rr }))}
                  hoverFormat={(p) => `${fmtSigned(p.y, 1)} vol`}
                />
              </div>
            </div>
          ) : null}

          <div className="grid shrink-0 grid-cols-3 gap-px overflow-hidden rounded-md border border-hairline bg-hairline">
            <ParamSpark
              k="svi-rho"
              label="ρ skew"
              rows={model.rows.map((r) => r.rho)}
              value={model.last.rho.toFixed(3)}
            />
            <ParamSpark
              k="svi-b"
              label="b wings"
              rows={model.rows.map((r) => r.b)}
              value={model.last.b.toExponential(1)}
            />
            <ParamSpark
              k="svi-sigma"
              label="σ curve"
              rows={model.rows.map((r) => r.sigma)}
              value={model.last.sigma.toFixed(3)}
            />
          </div>
        </>
      )}
    </Panel>
  );
}

function ParamSpark({
  k,
  label,
  rows,
  value,
}: {
  k: string;
  label: string;
  rows: number[];
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-panel px-3 py-2">
      <div className="flex items-baseline justify-between gap-1">
        <LabelTip k={k} className="label-micro">
          {label}
        </LabelTip>
        <span className="text-data tabular text-text-sec">{value}</span>
      </div>
      <Sparkline values={rows} className="h-5" />
    </div>
  );
}
