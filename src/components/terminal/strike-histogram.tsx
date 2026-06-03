"use client";

import { useState } from "react";
import { fmtPrice } from "@/lib/format";
import type { StrikeOi } from "@/lib/indexer/hooks";

const fmtMny = (m: number) =>
  `${m >= 0 ? "+" : "−"}${(Math.abs(m) * 100).toFixed(1)}%`;

/** Open interest by strike for the live oracle — one bar per traded strike on
 *  an adaptive moneyness axis, UP (green) stacked over DN (red). Hover a bar for
 *  the strike price, moneyness, and Up/Dn split. */
export function StrikeHistogram({ strikes }: { strikes: StrikeOi[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!strikes.length) return null;

  const max = Math.max(...strikes.map((s) => s.up + s.dn));
  // Symmetric around ATM so 0% sits dead-center under the smile's ATM line,
  // with ≥0.5% of breathing room even when every strike is glued to spot.
  const reach = Math.max(0.005, ...strikes.map((s) => Math.abs(s.mny))) * 1.25;
  const lo = -reach;
  const hi = reach;
  const span = 2 * reach;
  const x = (m: number) => ((m - lo) / span) * 100;

  const active = hover != null ? strikes[hover] : null;

  return (
    <div className="relative h-16 w-full select-none">
      {/* plot area (above the axis labels) */}
      <div className="absolute inset-x-0 top-0 bottom-4">
        <div className="absolute inset-x-0 bottom-0 h-px bg-hairline" />
        {/* ATM crosshair, aligned with the smile's ATM marker semantics */}
        <div
          className="absolute top-0 bottom-0 w-px bg-text-faint/30"
          style={{ left: `${x(0)}%` }}
        />
        {strikes.map((s, i) => {
          const total = s.up + s.dn;
          const upFrac = total ? s.up / total : 0;
          return (
            <div
              key={s.strike}
              className="absolute bottom-0 w-2.5 -translate-x-1/2 cursor-default overflow-hidden rounded-t-[2px] transition-opacity"
              style={{
                left: `${x(s.mny)}%`,
                height: `${(total / max) * 100}%`,
                opacity: hover == null || hover === i ? 1 : 0.4,
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="w-full bg-safe/85" style={{ height: `${upFrac * 100}%` }} />
              <div
                className="w-full bg-breach/85"
                style={{ height: `${(1 - upFrac) * 100}%` }}
              />
            </div>
          );
        })}
        {/* hover tooltip */}
        {active ? (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded border border-hairline bg-panel-elev px-1.5 py-1 whitespace-nowrap"
            style={{ left: `${Math.max(18, Math.min(x(active.mny), 82))}%` }}
          >
            <div className="text-val tabular">
              {fmtPrice(active.strike)}{" "}
              <span className="text-text-faint">{fmtMny(active.mny)}</span>
            </div>
            <div className="label-micro tabular">
              <span className="text-safe">{active.up} Up</span>{" "}
              <span className="text-breach">{active.dn} Dn</span>
            </div>
          </div>
        ) : null}
      </div>
      {/* axis: low · ATM · high moneyness */}
      <div className="absolute inset-x-0 bottom-0 h-3.5">
        <span className="label-micro tabular absolute left-0 text-text-faint">
          {fmtMny(lo)}
        </span>
        <span
          className="label-micro absolute -translate-x-1/2 text-text-faint"
          style={{ left: `${x(0)}%` }}
        >
          ATM
        </span>
        <span className="label-micro tabular absolute right-0 text-text-faint">
          {fmtMny(hi)}
        </span>
      </div>
    </div>
  );
}
