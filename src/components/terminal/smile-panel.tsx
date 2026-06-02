"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useOracleState } from "@/lib/indexer/hooks";
import { fmtPctValue, fmtSigned } from "@/lib/format";
import {
  checkButterfly,
  decodeSvi,
  impliedVol,
  smile,
  yearsToExpiry,
  type ButterflyCheck,
} from "@/lib/svi";
import { useNow } from "@/lib/use-now";
import { useMarket } from "./market-context";
import { Panel } from "./panel";
import { Stat, Verdict } from "./stat";

// Readouts at ±10% log-moneyness (the wings blow up past that near expiry).
const WING = 0.1;

export function SmilePanel() {
  const { selectedOracleId } = useMarket();
  const { data, isLoading, isError } = useOracleState(selectedOracleId);
  const now = useNow();

  const model = useMemo(() => {
    if (!data?.latest_svi || !data.oracle) return null;
    const p = decodeSvi(data.latest_svi);
    const bf = checkButterfly(p);
    const T = yearsToExpiry(data.oracle.expiry, now);
    if (T <= 0 || data.oracle.status === "settled") {
      return { settled: true as const, bf };
    }
    const pts = smile(p, T, { kMin: -0.35, kMax: 0.35, steps: 64 });
    const atm = impliedVol(0, p, T) * 100;
    const put = impliedVol(-WING, p, T) * 100;
    const call = impliedVol(WING, p, T) * 100;
    return { settled: false as const, pts, atm, put, call, skew: put - call, bf };
  }, [data, now]);

  return (
    <Panel title="SMILE / SKEW" code="±10% k">
      {!selectedOracleId ? (
        <p className="label-micro text-text-dim">no active market</p>
      ) : isError ? (
        <p className="label-micro text-breach">smile feed unreachable</p>
      ) : isLoading || !model ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full bg-panel-elev" />
          <Skeleton className="h-4 w-2/3 bg-panel-elev" />
          <Skeleton className="h-4 w-1/2 bg-panel-elev" />
        </div>
      ) : model.settled ? (
        <div className="flex h-full flex-col justify-between gap-2">
          <p className="label-micro text-text-dim">
            expiry settled — no live smile
          </p>
          <ArbVerdict bf={model.bf} />
        </div>
      ) : (
        <div className="flex h-full flex-col gap-2">
          <SmileSpark pts={model.pts} />
          <div className="mt-1">
            <Stat label="ATM" value={fmtPctValue(model.atm)} tone="accent" />
            <Stat label="put −10%" value={fmtPctValue(model.put)} />
            <Stat label="call +10%" value={fmtPctValue(model.call)} />
            <Stat
              label="skew"
              value={fmtSigned(model.skew, 1)}
              tone={model.skew >= 0 ? "default" : "warn"}
            />
          </div>
          <div className="mt-auto pt-1">
            <ArbVerdict bf={model.bf} />
          </div>
        </div>
      )}
    </Panel>
  );
}

function ArbVerdict({ bf }: { bf: ButterflyCheck }) {
  return bf.butterflyFree ? (
    <Verdict tone="safe" sub="butterfly · Durrleman g(k) ≥ 0">
      ARB-FREE ✓
    </Verdict>
  ) : (
    <Verdict tone="breach" sub={`${bf.violations.length} butterfly violations`}>
      BUTTERFLY ✕
    </Verdict>
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
