"use client";

import { fmtDuration } from "@/lib/format";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** What the surface raycaster hands up for the hover readout. x/y are pixel
 *  coordinates inside the canvas (offsetX/offsetY of the pointer). */
export interface HoverInfo {
  x: number;
  y: number;
  k: number; // log-moneyness
  T: number; // years to expiry at the snapped real tenor
  iv: number; // implied vol, 0..1
  tenorIndex: number; // index of the snapped tenor in the bottom strip
}

/** A labeled mono readout floated above the hovered node. Leads with IV (the
 *  verdict), with strike + tenor as supporting rows. Popover chrome matches the
 *  design system (bg-panel-elev, hairline border). */
export function SurfaceReadout({ info }: { info: HoverInfo | null }) {
  if (!info) return null;
  const moneyness = (Math.exp(info.k) - 1) * 100;
  const sign = moneyness >= 0 ? "+" : "−";
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[125%] whitespace-nowrap rounded border border-hairline bg-panel-elev px-2 py-1.5 shadow-lg"
      style={{ left: info.x, top: info.y }}
    >
      <div className="grid grid-cols-[auto_auto] items-baseline gap-x-3 gap-y-0.5">
        <span className="label-micro text-text-faint">IV</span>
        <span className="text-right text-data tabular text-accent-brand">
          {(info.iv * 100).toFixed(1)}%
        </span>

        <span className="label-micro text-text-faint">Moneyness</span>
        <span className="text-right text-data tabular text-text-sec">
          {sign}
          {Math.abs(moneyness).toFixed(1)}%
        </span>

        <span className="label-micro text-text-faint">Tenor</span>
        <span className="text-right text-data tabular text-text-sec">
          {fmtDuration(info.T * MS_PER_YEAR)}
        </span>
      </div>
    </div>
  );
}
