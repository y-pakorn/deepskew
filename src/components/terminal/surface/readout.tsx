"use client";

import { fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** What the surface raycaster hands up for the hover readout. x/y are pixel
 *  coordinates inside the canvas (offsetX/offsetY of the pointer). */
export interface HoverInfo {
  x: number;
  y: number;
  w: number; // canvas client width (for edge-clamping the readout)
  h: number; // canvas client height
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
  // Keep the popover inside the canvas: clamp x to a padding inset, and drop it
  // below the cursor when there isn't room to float above (e.g. the IV peak).
  const left = Math.max(80, Math.min(info.x, info.w - 80));
  const below = info.y < 88;
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded border border-hairline bg-panel-elev px-2 py-1.5 shadow-lg",
        below ? "translate-y-3" : "-translate-y-[125%]",
      )}
      style={{ left, top: info.y }}
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
