"use client";

import { useMemo } from "react";
import { useDvol } from "@/lib/cross-venue";
import { useTermStructure } from "@/lib/indexer/hooks";
import { fmtDuration, fmtPctValue, fmtSigned } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
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

/** Predict's ATM vol against Deribit's DVOL across the whole tenor set, as a
 *  diverging spread (Predict − Deribit) per expiry — green = Predict rich, red =
 *  cheap. The cross-sectional vol-arb view. */
export function VolArbPanel({ className }: { className?: string }) {
  const { rows } = useTermStructure();
  const { data: dvol = [], isLoading, isError } = useDvol();
  const now = useNow();

  const deribit = dvol.length ? dvol[dvol.length - 1].value : null;
  const predictAtm = rows[0]?.atmIV != null ? rows[0].atmIV * 100 : null;
  const spread =
    predictAtm != null && deribit != null ? predictAtm - deribit : null;

  const tenors = useMemo(
    () =>
      rows.map((r) => ({
        label: fmtDuration(r.expiry - now),
        atm: r.atmIV * 100,
        spread: deribit != null ? r.atmIV * 100 - deribit : 0,
      })),
    [rows, deribit, now],
  );
  const maxSpread = Math.max(2, ...tenors.map((t) => Math.abs(t.spread)));

  return (
    <Panel
      title="Predict vs Deribit"
      code="ATM vol by tenor · vs DVOL"
      className={className}
      bodyClassName="flex flex-col gap-2 overflow-hidden 2xl:gap-3"
      right={<span className="label-micro text-text-faint">DVOL · BTC</span>}
      light={
        !isError && predictAtm != null ? (
          <LightCard>
            <LightLede>
              {spread != null ? (
                <>
                  Our prices are running a bit{" "}
                  {spread >= 0 ? "richer" : "cheaper"} than the rest of the
                  market, about{" "}
                  <Num tone={spread >= 0 ? "safe" : "warn"}>
                    {fmtSigned(spread, 1)}
                  </Num>{" "}
                  vol points {spread >= 0 ? "above" : "below"} Deribit.
                </>
              ) : (
                <>We are pricing volatility, but the Deribit reference is unavailable right now.</>
              )}
            </LightLede>
            <div className="shrink-0">
              <LightSubLabel tip="dvol">
                Where our prices sit vs the market, by expiry
              </LightSubLabel>
              <div className="mt-1.5">
                {tenors.slice(0, 5).map((t, i) => (
                  <SpreadRow key={i} {...t} max={maxSpread} />
                ))}
              </div>
            </div>
            <LightFigures
              items={[
                {
                  label: "Our annual vol",
                  value: fmtPctValue(predictAtm),
                  tip: "atm-iv",
                },
                {
                  label: "Market · Deribit",
                  value: deribit != null ? fmtPctValue(deribit) : "—",
                  tip: "dvol",
                },
                {
                  label: "Difference",
                  value: spread != null ? fmtSigned(spread, 1) : "—",
                  tone:
                    spread == null
                      ? undefined
                      : spread >= 0
                        ? "safe"
                        : "warn",
                },
              ]}
            />
            <LightNote>
              Each bar is one expiry: green means our price is above the market
              reference, red means below. Pricing above Deribit means the vault
              is selling volatility at a premium.
            </LightNote>
          </LightCard>
        ) : null
      }
    >
      {isError ? (
        <PanelState kind="error">Deribit DVOL unreachable</PanelState>
      ) : predictAtm == null && isLoading ? (
        <PanelState kind="empty">Loading reference…</PanelState>
      ) : predictAtm == null ? (
        <PanelState kind="empty">Resolving Predict surface…</PanelState>
      ) : (
        <>
          <Hero
            label="Vol-arb spread · Predict − Deribit"
            tip="vol-arb"
            tone={spread != null && Math.abs(spread) >= 2 ? "accent" : "default"}
            value={spread != null ? fmtSigned(spread, 1) : "—"}
            sub={
              spread != null ? (
                <>
                  Predict {predictAtm.toFixed(0)}% vs Deribit{" "}
                  {deribit?.toFixed(0)}% ·{" "}
                  {spread > 0 ? "Predict rich · sell" : "Predict cheap · buy"}
                </>
              ) : (
                <>Deribit reference unavailable</>
              )
            }
          />

          <div className="grid grid-cols-[3.4rem_2.4rem_1fr_3.2rem] items-center gap-3 border-b border-hairline px-1 pb-1">
            <span className="label-micro">Tenor</span>
            <span className="label-micro text-right">ATM</span>
            <LabelTip k="vol-arb" className="label-micro">
              Cheap ◂ Predict − Deribit ▸ rich
            </LabelTip>
            <span className="label-micro text-right">Spread</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {tenors.map((t, i) => (
              <SpreadRow key={i} {...t} max={maxSpread} />
            ))}
          </div>

          <TileGrid cols={3} className="shrink-0">
            <StatTile
              label="Predict ATM"
              tip="atm-iv"
              value={fmtPctValue(predictAtm)}
              focal
            />
            <StatTile
              label="Deribit DVOL"
              tip="dvol"
              value={deribit != null ? fmtPctValue(deribit) : "—"}
            />
            <StatTile
              label="Spread"
              tip="vol-arb"
              value={spread != null ? fmtSigned(spread, 1) : "—"}
              tone={spread == null ? "dim" : spread >= 0 ? "safe" : "breach"}
            />
          </TileGrid>
        </>
      )}
    </Panel>
  );
}

function SpreadRow({
  label,
  atm,
  spread,
  max,
}: {
  label: string;
  atm: number;
  spread: number;
  max: number;
}) {
  const frac = max > 0 ? spread / max : 0;
  const rich = spread >= 0;
  return (
    <div className="grid min-h-[1.75rem] flex-1 grid-cols-[3.4rem_2.4rem_1fr_3.2rem] items-center gap-3 border-b border-hairline/40 px-1 text-data tabular">
      <span className="text-text-faint">{label}</span>
      <span className="text-right text-text-sec">{atm.toFixed(0)}</span>
      <div className="relative h-2.5">
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-divider" />
        <div
          className={cn(
            "absolute inset-y-0 rounded-sm",
            rich ? "bg-safe/70" : "bg-breach/70",
          )}
          style={
            rich
              ? { left: "50%", width: `${Math.abs(frac) * 48}%` }
              : { right: "50%", width: `${Math.abs(frac) * 48}%` }
          }
        />
      </div>
      <span className={cn("text-right", rich ? "text-safe" : "text-breach")}>
        {fmtSigned(spread, 1)}
      </span>
    </div>
  );
}
