"use client";

import { useTermStructure } from "@/lib/indexer/hooks";
import { fmtDuration } from "@/lib/format";
import { checkButterfly, checkCalendar } from "@/lib/svi";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";
import { Pill } from "./pill";
import { SurfaceScene } from "./surface/scene";

/** The visual hero — a live glowing 3-D IV surface across the term structure. */
export function SurfacePanel({ className }: { className?: string }) {
  const { rows, version } = useTermStructure();
  const now = useNow();

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
      title="IV surface"
      code="BTC · SVI"
      className={className}
      right={
        <span className="flex items-center gap-2">
          {arb ? (
            <Pill tone={arbOk ? "up" : "down"}>
              {arbOk
                ? "arb-free ✓"
                : !arb.calendarFree
                  ? "calendar ✕"
                  : "butterfly ✕"}
            </Pill>
          ) : null}
          <span className="label-micro text-text-faint">
            {ready ? `${rows.length} tenors` : "hero"}
          </span>
        </span>
      }
      bodyClassName="relative p-0"
    >
      <div className="absolute inset-0 overflow-hidden">
        {ready ? (
          <SurfaceScene rows={rows} version={version} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="label-micro animate-pulse text-text-dim">
              resolving surface…
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-2 flex items-center gap-2">
          <span className="label-micro text-text-faint">IV</span>
          <div
            className="h-1.5 w-14 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgb(26,51,122), rgb(13,140,217), rgb(33,212,236), rgb(184,247,255))",
            }}
          />
        </div>
        {frontIV != null && backIV != null ? (
          <div className="pointer-events-none absolute left-3 top-8 text-val tabular text-text-dim">
            ATM <span className="text-foreground">{frontIV.toFixed(0)}%</span> →{" "}
            {backIV.toFixed(0)}%
          </div>
        ) : null}
        <span className="pointer-events-none absolute right-3 top-2 label-micro text-text-faint">
          strike →
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 overflow-hidden border-t border-hairline bg-canvas/50 px-3 py-1.5 backdrop-blur-sm">
          <span className="label-micro">tenor</span>
          {rows.map((r, i) => (
            <span
              key={r.oracleId}
              className={cn(
                "text-val tabular",
                i === 0 ? "text-accent-brand" : "text-text-dim",
              )}
            >
              {fmtDuration(r.expiry - now)}
            </span>
          ))}
          <span className="ml-auto label-micro shrink-0 text-text-faint">
            drag to orbit
          </span>
        </div>
      </div>
    </Panel>
  );
}
