"use client";

import { useMemo } from "react";
import {
  rollingRealizedVol,
  useBinanceCloses,
  useDvol,
  type VolPoint,
} from "@/lib/cross-venue";
import { fmtPctValue, fmtSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Hero, StatTile, TileGrid } from "../stat";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";

/** Implied (Deribit DVOL) vs trailing realized (Binance) over 7 days — the gap
 *  is the vol-risk-premium the LP/vault harvests. The dual-line chart is the
 *  whole story; positive VRP = options rich = sell vol. */
export function VrpPanel({ className }: { className?: string }) {
  const dvolQ = useDvol();
  const binanceQ = useBinanceCloses();
  const implied = useMemo(() => dvolQ.data ?? [], [dvolQ.data]);
  const realized = useMemo(
    () => rollingRealizedVol(binanceQ.data ?? [], 24),
    [binanceQ.data],
  );

  const impliedLast = implied.length ? implied[implied.length - 1].value : null;
  const realizedLast = realized.length
    ? realized[realized.length - 1].value
    : null;
  const vrp =
    impliedLast != null && realizedLast != null
      ? impliedLast - realizedLast
      : null;

  const isError = dvolQ.isError || binanceQ.isError;
  const isLoading = dvolQ.isLoading || binanceQ.isLoading;

  return (
    <Panel
      title="Implied vs realized"
      code="vol-risk-premium · 7d hourly"
      className={className}
      bodyClassName="flex flex-col gap-2 overflow-hidden 2xl:gap-3"
      right={
        <span className="label-micro text-text-faint">
          <span className="text-warn">implied</span> ·{" "}
          <span className="text-accent-brand">realized</span>
        </span>
      }
    >
      {isError ? (
        <PanelState kind="error">Reference vol unreachable</PanelState>
      ) : isLoading && !implied.length ? (
        <PanelState kind="empty">Loading vol series…</PanelState>
      ) : vrp == null ? (
        <PanelState kind="empty">Resolving vol series…</PanelState>
      ) : (
        <>
          <Hero
            label="Vol-risk-premium · vol pts"
            tip="vrp"
            tone={vrp >= 0 ? "safe" : "breach"}
            value={fmtSigned(vrp, 1)}
            sub={
              <>
                implied {impliedLast?.toFixed(0)}% − realized{" "}
                {realizedLast?.toFixed(0)}% ·{" "}
                {vrp >= 0 ? "sell vol · LP edge" : "buy vol"}
              </>
            }
          />

          <div className="min-h-0 flex-1">
            <DualLine
              a={implied}
              b={realized}
              className="h-full min-h-[120px]"
            />
          </div>

          <TileGrid cols={3} className="shrink-0">
            <StatTile
              label="Implied · Deribit"
              tip="dvol"
              value={impliedLast != null ? fmtPctValue(impliedLast) : "—"}
              tone="warn"
            />
            <StatTile
              label="Realized · Binance"
              tip="realized-vol"
              value={realizedLast != null ? fmtPctValue(realizedLast) : "—"}
            />
            <StatTile
              label="VRP"
              tip="vrp"
              value={fmtSigned(vrp, 1)}
              tone={vrp >= 0 ? "safe" : "breach"}
              focal
            />
          </TileGrid>
        </>
      )}
    </Panel>
  );
}

/** Two time series on a shared axis with end-point markers: warn (implied) and
 *  accent (realized). The vertical gap between them is the vol-risk-premium. */
function DualLine({
  a,
  b,
  className,
}: {
  a: VolPoint[];
  b: VolPoint[];
  className?: string;
}) {
  if (a.length < 2 && b.length < 2) return null;
  const all = [...a, ...b];
  const xs = all.map((p) => p.ts);
  const ys = all.map((p) => p.value);
  const xlo = Math.min(...xs);
  const xhi = Math.max(...xs);
  let ylo = Math.min(...ys);
  let yhi = Math.max(...ys);
  const pad = (yhi - ylo) * 0.12 || 1;
  ylo -= pad;
  yhi += pad;
  const sx = (ts: number) => ((ts - xlo) / (xhi - xlo || 1)) * 100;
  const sy = (v: number) => 100 - ((v - ylo) / (yhi - ylo || 1)) * 100;
  const path = (pts: VolPoint[]) =>
    pts.length < 2
      ? ""
      : pts
          .map(
            (p, i) =>
              `${i ? "L" : "M"}${sx(p.ts).toFixed(2)} ${sy(p.value).toFixed(2)}`,
          )
          .join(" ");
  const endDot = (pts: VolPoint[], color: string) =>
    pts.length ? (
      <circle
        cx={sx(pts[pts.length - 1].ts)}
        cy={sy(pts[pts.length - 1].value)}
        r="1.6"
        fill={color}
        vectorEffect="non-scaling-stroke"
      />
    ) : null;
  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden
      >
        <path
          d={path(b)}
          fill="none"
          stroke="var(--accent-brand)"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={path(a)}
          fill="none"
          stroke="var(--warn)"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
        {endDot(b, "var(--accent-brand)")}
        {endDot(a, "var(--warn)")}
      </svg>
    </div>
  );
}
