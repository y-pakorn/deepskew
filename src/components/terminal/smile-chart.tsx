"use client";

import { useRef, useState } from "react";

/** Smile cross-section: IV vs log-moneyness, ATM marker, hover crosshair + IV
 *  readout. SVG draws the curve (crisp via non-scaling-stroke); labels are HTML. */
const VB = 100;

export function SmileChart({ pts }: { pts: { k: number; iv: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ frac: number; k: number; iv: number } | null>(
    null,
  );

  if (pts.length < 2) return null;
  const ivs = pts.map((p) => p.iv);
  let lo = Math.min(...ivs);
  let hi = Math.max(...ivs);
  const pad = (hi - lo) * 0.12 || 0.02;
  lo -= pad;
  hi += pad;

  const sx = (i: number) => (i / (pts.length - 1)) * VB;
  const sy = (iv: number) => VB - ((iv - lo) / (hi - lo || 1)) * VB;
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${sx(i).toFixed(2)} ${sy(p.iv).toFixed(2)}`)
    .join(" ");
  const area = `${line} L${VB} ${VB} L0 ${VB} Z`;
  const k0 = pts[0].k;
  const k1 = pts[pts.length - 1].k;
  const atmX = ((0 - k0) / (k1 - k0)) * VB;

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const p = pts[Math.round(frac * (pts.length - 1))];
    setHover({ frac, k: p.k, iv: p.iv });
  };

  return (
    <div
      ref={ref}
      className="relative min-h-[140px] w-full flex-1"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="smileFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-brand)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1={VB / 2}
          x2={VB}
          y2={VB / 2}
          stroke="var(--hairline)"
          strokeWidth="0.5"
        />
        <line
          x1={atmX}
          y1="0"
          x2={atmX}
          y2={VB}
          stroke="var(--text-faint)"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
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
        <path d={area} fill="url(#smileFill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--accent-brand)"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="label-micro absolute top-0.5 left-1 text-text-faint">
        {(hi * 100).toFixed(0)}%
      </span>
      <span className="label-micro absolute bottom-0.5 left-1 text-text-faint">
        {(k0 * 100).toFixed(0)}%
      </span>
      <span className="label-micro absolute bottom-0.5 left-1/2 -translate-x-1/2 text-text-faint">
        ATM
      </span>
      <span className="label-micro absolute right-1 bottom-0.5 text-text-faint">
        +{(k1 * 100).toFixed(0)}%
      </span>
      {hover ? (
        <div
          className="pointer-events-none absolute top-0.5 z-10 -translate-x-1/2 rounded border border-hairline bg-panel-elev px-1.5 py-0.5 text-val whitespace-nowrap tabular"
          style={{ left: `${Math.max(14, Math.min(hover.frac * 100, 86))}%` }}
        >
          <span className="text-accent-brand">{(hover.iv * 100).toFixed(1)}%</span>{" "}
          <span className="text-text-faint">
            {hover.k >= 0 ? "+" : ""}
            {(hover.k * 100).toFixed(0)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}
