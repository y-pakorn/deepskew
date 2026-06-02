"use client";

import { useMemo } from "react";
import { useSurfaceSvis } from "@/lib/indexer/hooks";
import type { OracleInfo } from "@/lib/indexer/types";
import { fmtDuration } from "@/lib/format";
import type { SurfaceRow } from "@/lib/surface";
import {
  checkButterfly,
  checkCalendar,
  decodeSvi,
  yearsToExpiry,
} from "@/lib/svi";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useMarket } from "./market-context";
import { Panel } from "./panel";
import { SurfaceScene } from "./surface/scene";

// Sample a real term structure (log-spaced ~30m → ~2w), not just the nearest
// expiries — otherwise the surface is nine exploding intraday smiles in a row.
const TENOR_TARGETS_MIN = [30, 60, 120, 240, 480, 1440, 2880, 10080, 20160];

function selectTermStructure(
  oracles: OracleInfo[],
  nowMs: number,
): OracleInfo[] {
  if (!oracles.length) return [];
  const picked = new Map<string, OracleInfo>();
  for (const min of TENOR_TARGETS_MIN) {
    const want = nowMs + min * 60_000;
    let best: OracleInfo | null = null;
    let bestD = Infinity;
    for (const o of oracles) {
      const d = Math.abs(o.expiry - want);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    if (best) picked.set(best.oracle_id, best);
  }
  return [...picked.values()].sort((a, b) => a.expiry - b.expiry);
}

interface Row extends SurfaceRow {
  oracleId: string;
  expiry: number;
}

/** The visual hero — a live glowing 3-D IV surface across the term structure. */
export function SurfacePanel({ className }: { className?: string }) {
  const { activeOracles } = useMarket();
  const now = useNow();

  // Re-pick the tenor set at most once a minute (keeps the SVI fetch set stable).
  const refNow = Math.floor(now / 60_000) * 60_000;
  const tenors = useMemo(
    () => selectTermStructure(activeOracles, refNow),
    [activeOracles, refNow],
  );
  const svis = useSurfaceSvis(tenors);

  // Cheap per render; the heavy geometry build (VolSurface) is keyed on
  // `version` (the SVI checksum) so it only rebuilds when the data ticks.
  const rows: Row[] = [];
  let version = 0;
  svis.forEach((q, i) => {
    const o = tenors[i];
    const svi = q.data;
    if (!o || !svi) return;
    const T = yearsToExpiry(o.expiry, svi.checkpoint_timestamp_ms);
    if (T <= 0) return;
    rows.push({
      T,
      params: decodeSvi(svi),
      oracleId: o.oracle_id,
      expiry: o.expiry,
    });
    version += svi.checkpoint;
  });
  rows.sort((a, b) => a.T - b.T);

  const ready = rows.length >= 2;
  const arb = ready
    ? {
        calendarFree: checkCalendar(rows.map((r) => ({ T: r.T, p: r.params })))
          .calendarFree,
        butterflyFree: rows.every((r) => checkButterfly(r.params).butterflyFree),
      }
    : null;
  const arbOk = arb ? arb.calendarFree && arb.butterflyFree : false;

  return (
    <Panel
      title="IV SURFACE"
      code="BTC · SVI"
      className={className}
      right={
        <span className="flex items-center gap-2">
          {arb ? (
            <span
              className={cn("label-micro", arbOk ? "text-safe" : "text-breach")}
            >
              {arbOk
                ? "ARB-FREE ✓"
                : !arb.calendarFree
                  ? "CALENDAR ✕"
                  : "BUTTERFLY ✕"}
            </span>
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
              {activeOracles.length ? "resolving surface…" : "no active market"}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-2 flex items-center gap-1.5">
          <span className="label-micro text-text-faint">IV</span>
          <div
            className="h-1.5 w-14 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgb(26,51,122), rgb(13,140,217), rgb(33,212,236), rgb(184,247,255))",
            }}
          />
        </div>
        <span className="pointer-events-none absolute right-3 top-2 label-micro text-text-faint">
          strike →
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 overflow-hidden border-t border-hairline bg-canvas/50 px-3 py-1.5 backdrop-blur-sm">
          <span className="label-micro">tenor</span>
          {rows.map((r, i) => (
            <span
              key={r.oracleId}
              className={cn(
                "font-mono text-[11px] tabular",
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
