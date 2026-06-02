"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSviLatest } from "@/lib/indexer/hooks";
import { fmtPctValue, fmtSigned } from "@/lib/format";
import { checkButterfly, decodeSvi, impliedVol, smile } from "@/lib/svi";
import { Panel } from "./panel";
import { Stat, Verdict } from "./stat";

// Provisional time-to-expiry for display-only IV (real T comes from the oracle
// state in the Surface room). The arb-free check below is T-independent.
const PROVISIONAL_T = 1 / (365.25 * 24); // ~1h in years

export function SmilePanel() {
  const { data, isLoading, isError } = useSviLatest();

  const model = useMemo(() => {
    if (!data) return null;
    const p = decodeSvi(data);
    const pts = smile(p, PROVISIONAL_T, { kMin: -0.6, kMax: 0.6, steps: 64 });
    const atm = impliedVol(0, p, PROVISIONAL_T) * 100;
    const put25 = impliedVol(-0.25, p, PROVISIONAL_T) * 100;
    const call25 = impliedVol(0.25, p, PROVISIONAL_T) * 100;
    return { pts, atm, put25, call25, skew: put25 - call25, bf: checkButterfly(p) };
  }, [data]);

  return (
    <Panel title="SMILE / SKEW" code="25Δ">
      {isError ? (
        <p className="label-micro text-breach">smile feed unreachable</p>
      ) : isLoading || !model ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full bg-panel-elev" />
          <Skeleton className="h-4 w-2/3 bg-panel-elev" />
          <Skeleton className="h-4 w-1/2 bg-panel-elev" />
        </div>
      ) : (
        <div className="flex h-full flex-col gap-2">
          <SmileSpark pts={model.pts} />
          <div className="mt-1">
            <Stat label="ATM" value={fmtPctValue(model.atm)} tone="accent" />
            <Stat label="25Δ put" value={fmtPctValue(model.put25)} />
            <Stat label="25Δ call" value={fmtPctValue(model.call25)} />
            <Stat
              label="skew"
              value={fmtSigned(model.skew, 1)}
              tone={model.skew >= 0 ? "default" : "warn"}
            />
          </div>
          <div className="mt-auto pt-1">
            {model.bf.butterflyFree ? (
              <Verdict tone="safe" sub="butterfly · Durrleman g(k) ≥ 0">
                ARB-FREE ✓
              </Verdict>
            ) : (
              <Verdict
                tone="breach"
                sub={`${model.bf.violations.length} butterfly violations`}
              >
                BUTTERFLY ✕
              </Verdict>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function SmileSpark({ pts }: { pts: { k: number; iv: number }[] }) {
  const w = 100;
  const h = 34;
  const ivs = pts.map((p) => p.iv);
  const min = Math.min(...ivs);
  const max = Math.max(...ivs);
  const span = max - min || 1;
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p.iv - min) / span) * (h - 4) - 2;
      return `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-9 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke="var(--accent-brand)"
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
