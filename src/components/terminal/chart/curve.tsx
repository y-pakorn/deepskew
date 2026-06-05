"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const VB = 100;

export interface XY {
  x: number;
  y: number;
}

export interface CurveMarker {
  x: number;
  label?: string;
  color?: string;
  dashed?: boolean;
}

/**
 * A single x/y curve in an SVG viewBox (crisp non-scaling stroke), with optional
 * area fill, a horizontal baseline rule, vertical markers, and a hover crosshair
 * that snaps to the nearest sample. The chart fills its container; pass a height
 * via `className`. Mirrors the SmileChart idiom so every desk chart reads alike.
 */
export function Curve({
  data,
  color = "var(--accent-brand)",
  fill = true,
  markers = [],
  baseline,
  yPadFrac = 0.12,
  hoverFormat,
  className,
}: {
  data: XY[];
  color?: string;
  fill?: boolean;
  markers?: CurveMarker[];
  baseline?: number;
  yPadFrac?: number;
  hoverFormat?: (p: XY) => string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ frac: number; p: XY } | null>(null);

  if (data.length < 2) return null;
  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const xlo = Math.min(...xs);
  const xhi = Math.max(...xs);
  let ylo = Math.min(...ys, baseline ?? Infinity);
  let yhi = Math.max(...ys, baseline ?? -Infinity);
  const span = yhi - ylo;
  const pad = (span || Math.abs(yhi) || 1) * yPadFrac;
  ylo -= pad;
  yhi += pad;

  const sx = (x: number) => ((x - xlo) / (xhi - xlo || 1)) * VB;
  const sy = (y: number) => VB - ((y - ylo) / (yhi - ylo || 1)) * VB;
  const line = data
    .map((d, i) => `${i ? "L" : "M"}${sx(d.x).toFixed(2)} ${sy(d.y).toFixed(2)}`)
    .join(" ");
  // Fill to the baseline when one is given (so an underwater/negative curve
  // shades the deviation from the baseline, not the whole panel); else to the
  // chart floor.
  const baseY = (baseline != null ? sy(baseline) : VB).toFixed(2);
  const area = `${line} L${VB} ${baseY} L0 ${baseY} Z`;

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const p = data[Math.round(frac * (data.length - 1))];
    setHover({ frac, p });
  };

  return (
    <div
      ref={ref}
      className={cn("relative w-full", className)}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {baseline != null ? (
          <line
            x1="0"
            y1={sy(baseline)}
            x2={VB}
            y2={sy(baseline)}
            stroke="var(--hairline)"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {markers.map((m, i) => (
          <line
            key={i}
            x1={sx(m.x)}
            y1="0"
            x2={sx(m.x)}
            y2={VB}
            stroke={m.color ?? "var(--text-faint)"}
            strokeWidth="0.8"
            strokeDasharray={m.dashed === false ? undefined : "2 2"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {hover ? (
          <line
            x1={hover.frac * VB}
            y1="0"
            x2={hover.frac * VB}
            y2={VB}
            stroke="var(--accent-brand)"
            strokeWidth="0.6"
            opacity="0.7"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {fill ? <path d={area} fill={color} fillOpacity="0.13" /> : null}
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {markers.map((m, i) =>
        m.label ? (
          <span
            key={i}
            className="label-micro pointer-events-none absolute bottom-0.5 -translate-x-1/2 text-text-faint"
            style={{ left: `${Math.max(8, Math.min(sx(m.x), 92))}%` }}
          >
            {m.label}
          </span>
        ) : null,
      )}
      {hover && hoverFormat ? (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded border border-hairline bg-panel-elev px-1.5 py-0.5 text-val whitespace-nowrap tabular"
          style={{ left: `${Math.max(14, Math.min(hover.frac * 100, 86))}%` }}
        >
          {hoverFormat(hover.p)}
        </div>
      ) : null}
    </div>
  );
}
