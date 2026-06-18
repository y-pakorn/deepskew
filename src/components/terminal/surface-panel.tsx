"use client";

import { useState } from "react";
import { useTermStructure } from "@/lib/indexer/hooks";
import { fmtDuration, fmtPctValue } from "@/lib/format";
import { checkButterfly, checkCalendar } from "@/lib/svi";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { Curve } from "./chart/curve";
import { LabelTip } from "./label-tip";
import {
  LightCard,
  LightFigures,
  LightLede,
  LightNote,
  LightSubLabel,
  Num,
} from "./light";
import { useMarket } from "./market-context";
import { Panel } from "./panel";
import { Pill } from "./pill";
import { SurfaceScene } from "./surface/scene";
import { TextSwap } from "./text-swap";

/** The visual hero — a live glowing 3-D IV surface across the term structure. */
export function SurfacePanel({ className }: { className?: string }) {
  const { rows, version } = useTermStructure();
  const { selectedOracleId, setSelectedOracleId } = useMarket();
  const now = useNow();
  const [hoverTenor, setHoverTenor] = useState<number | null>(null);

  const selectedIndex = rows.findIndex((r) => r.oracleId === selectedOracleId);

  const ready = rows.length >= 2;
  const arb = ready
    ? {
        calendarFree: checkCalendar(rows.map((r) => ({ T: r.T, p: r.params })))
          .calendarFree,
        butterflyFree: rows.every((r) => checkButterfly(r.params).butterflyFree),
      }
    : null;
  const arbOk = arb ? arb.calendarFree && arb.butterflyFree : false;
  const frontIV = ready ? rows[0].atmIV * 100 : null;
  const backIV = ready ? rows[rows.length - 1].atmIV * 100 : null;

  return (
    <Panel
      title="IV Surface"
      code="BTC · SVI"
      className={className}
      light={
        ready && frontIV != null && backIV != null ? (
          <LightCard fill>
            <LightLede>
              {arbOk ? (
                <>
                  Option prices line up across all <Num>{rows.length}</Num>{" "}
                  expiries, with{" "}
                  <Num tone="safe">no risk-free mispricing</Num> to exploit.
                </>
              ) : (
                <>
                  Option prices are{" "}
                  <Num tone="breach">misaligned</Num> across expiries right now,
                  a possible mispricing.
                </>
              )}
            </LightLede>
            <div className="flex min-h-0 flex-1 flex-col">
              <LightSubLabel tip="atm-term-curve">
                Annual vol, nearest to farthest expiry
              </LightSubLabel>
              <div className="mt-1.5 flex min-h-0 flex-1 flex-col">
                <Curve
                  data={rows.map((r, i) => ({ x: i, y: r.atmIV * 100 }))}
                  className="min-h-32 flex-1"
                  hoverFormat={(p) => `${p.y.toFixed(0)}% vol`}
                />
              </div>
            </div>
            <LightFigures
              items={[
                {
                  label: "Near-term vol",
                  value: fmtPctValue(frontIV),
                  tip: "atm-iv",
                },
                {
                  label: "Long-dated vol",
                  value: fmtPctValue(backIV),
                  tip: "atm-term-curve",
                },
                {
                  label: "Consistency",
                  value: arbOk ? "Clean ✓" : "Flagged ✕",
                  tone: arbOk ? "safe" : "breach",
                  tip: "arb-free",
                },
              ]}
            />
            <LightNote>
              The line shows the annual volatility the market expects from the
              nearest expiry to the farthest; when it stays orderly there is no
              arbitrage across expiries.
            </LightNote>
          </LightCard>
        ) : null
      }
      right={
        <span className="flex items-center gap-2">
          {arb ? (
            <Pill
              tone={arbOk ? "up" : "down"}
              tip={
                arbOk
                  ? "arb-free"
                  : !arb.calendarFree
                    ? "calendar-arb"
                    : "butterfly-arb"
              }
            >
              <TextSwap>
                {arbOk
                  ? "Arb-free ✓"
                  : !arb.calendarFree
                    ? "Calendar ✕"
                    : "Butterfly ✕"}
              </TextSwap>
            </Pill>
          ) : null}
          <span className="label-micro text-text-faint">
            {ready ? (
              <>
                <span className="tabular">{rows.length}</span> tenors
              </>
            ) : (
              "Resolving"
            )}
          </span>
        </span>
      }
      bodyClassName="relative p-0"
    >
      <div className="absolute inset-0 overflow-hidden">
        {ready ? (
          <SurfaceScene
            rows={rows}
            version={version}
            onTenorHover={setHoverTenor}
            selectedIndex={selectedIndex}
            onSelect={(i) => {
              const r = rows[i];
              if (r) setSelectedOracleId(r.oracleId);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="label-micro animate-pulse text-text-dim">
              Resolving surface…
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-2 flex items-center gap-2">
          <LabelTip
            k="iv-heat-legend"
            className="pointer-events-auto label-micro text-text-faint"
          >
            IV
          </LabelTip>
          <div
            className="h-1.5 w-14 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgb(26,51,122), rgb(13,140,217), rgb(33,212,236), rgb(184,247,255))",
            }}
          />
        </div>
        {frontIV != null && backIV != null ? (
          <div className="pointer-events-none absolute left-3 top-8 text-data tabular text-text-dim">
            <LabelTip k="atm-term-overlay" className="pointer-events-auto">
              ATM
            </LabelTip>{" "}
            <span className="text-foreground">{frontIV.toFixed(0)}%</span> →{" "}
            {backIV.toFixed(0)}%
          </div>
        ) : null}
        <LabelTip
          k="strike-axis-hint"
          className="pointer-events-auto absolute right-3 top-2 label-micro text-text-faint"
        >
          Strike →
        </LabelTip>

        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-hairline bg-canvas/50 px-3 py-1.5 backdrop-blur-sm">
          <LabelTip k="tenor-axis" className="label-micro shrink-0">
            Tenor
          </LabelTip>
          {/* Each tenor reads "34m 09s" — keep it on one line and let the row
              clip trailing tenors rather than wrap them when space is tight.
              Click one to switch the whole desk to that expiry. */}
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden [mask-image:linear-gradient(to_right,#000_88%,transparent)]">
            {rows.map((r, i) => {
              const selected = r.oracleId === selectedOracleId;
              return (
                <button
                  key={r.oracleId}
                  type="button"
                  onClick={() => setSelectedOracleId(r.oracleId)}
                  onPointerEnter={() => setHoverTenor(i)}
                  onPointerLeave={() => setHoverTenor(null)}
                  aria-pressed={selected}
                  title="Switch the desk to this expiry"
                  className={cn(
                    "shrink-0 cursor-pointer whitespace-nowrap rounded-sm text-data tabular underline-offset-4 outline-none transition-colors focus-visible:ring-1 focus-visible:ring-accent-brand",
                    selected
                      ? "text-accent-brand underline decoration-accent-brand"
                      : hoverTenor === i
                        ? "text-foreground underline decoration-accent-brand/60"
                        : "text-text-dim hover:text-text-sec",
                  )}
                >
                  {fmtDuration(r.expiry - now)}
                </button>
              );
            })}
          </div>
          <span className="hidden shrink-0 text-text-faint label-micro xl:inline">
            Drag to orbit
          </span>
        </div>
      </div>
    </Panel>
  );
}
