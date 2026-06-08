"use client";

import { useMemo } from "react";
import { useOracleState } from "@/lib/indexer/hooks";
import { fmtPctValue, fmtSigned } from "@/lib/format";
import {
  decodeSvi,
  impliedVol,
  skewMetrics,
  smile,
  yearsToExpiry,
  type SviParams,
} from "@/lib/svi";
import { cn } from "@/lib/utils";
import { LabelTip } from "../label-tip";
import { useMarket } from "../market-context";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";
import { SmileChart } from "../smile-chart";
import { Hero, StatTile, TileGrid } from "../stat";

const WING = 0.1; // ±10% wings
const STRIKES = [-0.2, -0.1, 0, 0.1, 0.2];

/** The vol smile for the selected expiry — implied vol across moneyness, the
 *  core object the rest of the tab dissects. Leads with ATM IV, with the wing /
 *  25Δ skew readouts and a vol-by-strike strip. */
export function SmileIvPanel({ className }: { className?: string }) {
  const { selectedOracleId } = useMarket();
  const { data: state, isLoading, isError } = useOracleState(selectedOracleId);

  const model = useMemo(() => {
    const svi = state?.latest_svi;
    if (!state || !svi) return null;
    const p = decodeSvi(svi);
    const T = yearsToExpiry(state.oracle.expiry, svi.checkpoint_timestamp_ms);
    if (state.oracle.status === "settled" || T <= 0)
      return { settled: true as const };
    const atm = impliedVol(0, p, T) * 100;
    const put = impliedVol(-WING, p, T) * 100;
    const call = impliedVol(WING, p, T) * 100;
    return {
      settled: false as const,
      p,
      T,
      atm,
      put,
      call,
      skew: put - call,
      sk: skewMetrics(p, T),
      pts: smile(p, T, { kMin: -0.3, kMax: 0.3, steps: 80 }),
    };
  }, [state]);

  return (
    <Panel
      title="Vol Smile"
      code="IV vs moneyness"
      className={className}
      bodyClassName="flex flex-col gap-2 overflow-hidden 2xl:gap-3"
    >
      {!selectedOracleId ? (
        <PanelState kind="empty">No active market</PanelState>
      ) : isError ? (
        <PanelState kind="error">Smile feed unreachable</PanelState>
      ) : isLoading || !model ? (
        <PanelState kind="empty">Resolving smile…</PanelState>
      ) : model.settled ? (
        <PanelState kind="empty">Expiry settled — no live smile</PanelState>
      ) : (
        <>
          <Hero
            label="ATM implied vol"
            tip="atm-iv"
            value={fmtPctValue(model.atm)}
            sub={
              <>
                Put −10% {fmtPctValue(model.put)} · call +10%{" "}
                {fmtPctValue(model.call)} · skew {fmtSigned(model.skew, 1)}
              </>
            }
          />
          <SmileChart pts={model.pts} />
          <VolByStrike p={model.p} T={model.T} />
          <TileGrid cols={4} className="shrink-0">
            <StatTile
              label="Put −10%"
              tip="put-wing"
              value={fmtPctValue(model.put)}
            />
            <StatTile
              label="Call +10%"
              tip="call-wing"
              value={fmtPctValue(model.call)}
            />
            <StatTile
              label="RR 25Δ"
              tip="rr25"
              value={model.sk ? fmtSigned(model.sk.rr25, 1) : "—"}
              tone={model.sk && model.sk.rr25 < 0 ? "warn" : "default"}
            />
            <StatTile
              label="Fly 25Δ"
              tip="bf25"
              value={model.sk ? fmtSigned(model.sk.bf25, 1) : "—"}
            />
          </TileGrid>
        </>
      )}
    </Panel>
  );
}

function VolByStrike({ p, T }: { p: SviParams; T: number }) {
  return (
    <div className="shrink-0">
      <LabelTip k="vol-by-strike" className="label-micro">
        Vol by strike · IV %
      </LabelTip>
      <div className="mt-1 grid grid-cols-5 gap-1 text-center">
        {STRIKES.map((k) => {
          const iv = impliedVol(k, p, T) * 100;
          const atm = k === 0;
          return (
            <div key={k}>
              <div className="label-micro text-text-faint">
                {atm ? "ATM" : `${k > 0 ? "+" : ""}${(k * 100).toFixed(0)}`}
              </div>
              <div
                className={cn(
                  "text-md tabular leading-none font-medium",
                  atm ? "text-accent-brand" : "text-text-sec",
                )}
              >
                {iv.toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
