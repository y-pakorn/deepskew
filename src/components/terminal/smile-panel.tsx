"use client";

import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  useOracleState,
  useStrikeDistribution,
  useSviHistory,
} from "@/lib/indexer/hooks";
import { fmtPctValue, fmtSigned, utcClock } from "@/lib/format";
import {
  checkButterfly,
  decodeSvi,
  impliedVol,
  smile,
  yearsToExpiry,
  type ButterflyCheck,
} from "@/lib/svi";
import { cn } from "@/lib/utils";
import { useMarket } from "./market-context";
import { Panel } from "./panel";
import { SmileChart } from "./smile-chart";
import { StrikeHistogram } from "./strike-histogram";
import { Stat, Verdict } from "./stat";

const WING = 0.1; // ±10% log-moneyness readouts
const SMILE_OPTS = { kMin: -0.3, kMax: 0.3, steps: 80 };

export function SmilePanel() {
  const { selectedOracleId } = useMarket();
  const { data: state, isLoading, isError } = useOracleState(selectedOracleId);
  const { data: history = [] } = useSviHistory(selectedOracleId);
  const strikes = useStrikeDistribution(state?.latest_price?.spot ?? null);

  const [scrub, setScrub] = useState<number | null>(null); // null = live
  const n = history.length;
  const liveIdx = Math.max(0, n - 1);
  const idx = scrub == null ? liveIdx : Math.min(scrub, liveIdx);
  const isLive = scrub == null || idx >= liveIdx;

  const expiry = state?.oracle.expiry;
  const settled = state?.oracle.status === "settled";
  const snap = n > 0 ? history[idx] : (state?.latest_svi ?? null);

  const model = useMemo(() => {
    if (!snap || expiry == null) return null;
    const p = decodeSvi(snap);
    const bf = checkButterfly(p);
    const ts = snap.checkpoint_timestamp_ms;
    const T = yearsToExpiry(expiry, ts);
    if (T <= 0 || settled) return { settled: true as const, bf, ts };
    const atm = impliedVol(0, p, T) * 100;
    const put = impliedVol(-WING, p, T) * 100;
    const call = impliedVol(WING, p, T) * 100;
    return {
      settled: false as const,
      pts: smile(p, T, SMILE_OPTS),
      atm,
      put,
      call,
      skew: put - call,
      fly: (put + call) / 2 - atm,
      bf,
      ts,
    };
  }, [snap, expiry, settled]);

  return (
    <Panel
      title="Smile / skew"
      code={isLive ? "live" : "replay"}
      right={
        model ? (
          <span
            className={cn(
              "font-mono text-[11px] tabular",
              isLive ? "text-safe" : "text-warn",
            )}
          >
            {isLive ? "● live" : utcClock(new Date(model.ts))}
          </span>
        ) : null
      }
    >
      {!selectedOracleId ? (
        <p className="label-micro text-text-dim">no active market</p>
      ) : isError ? (
        <p className="label-micro text-breach">smile feed unreachable</p>
      ) : isLoading || !model ? (
        <div className="space-y-2">
          <div className="h-36 w-full animate-pulse rounded bg-panel-elev" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-panel-elev" />
        </div>
      ) : model.settled ? (
        <div className="flex h-full flex-col justify-between gap-2">
          <p className="label-micro text-text-dim">
            expiry settled — no live smile
          </p>
          <ArbVerdict bf={model.bf} />
        </div>
      ) : (
        <div className="flex h-full flex-col gap-3">
          <SmileChart pts={model.pts} />
          {strikes.length ? (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="label-micro">OI by strike</span>
                <span className="label-micro text-text-faint">
                  <span className="text-safe">up</span> ·{" "}
                  <span className="text-breach">dn</span>
                </span>
              </div>
              <StrikeHistogram buckets={strikes} />
            </div>
          ) : null}
          <div>
            <Stat label="ATM" value={fmtPctValue(model.atm)} tone="accent" />
            <Stat label="put −10%" value={fmtPctValue(model.put)} />
            <Stat label="call +10%" value={fmtPctValue(model.call)} />
            <Stat
              label="skew (RR)"
              value={fmtSigned(model.skew, 1)}
              tone={model.skew >= 0 ? "default" : "warn"}
            />
            <Stat label="fly" value={fmtSigned(model.fly, 1)} />
          </div>
          {n > 1 ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="label-micro">time-travel</span>
                <button
                  type="button"
                  onClick={() => setScrub(null)}
                  className={cn(
                    "label-micro transition-colors",
                    isLive
                      ? "text-text-faint"
                      : "text-accent-brand hover:opacity-80",
                  )}
                >
                  {isLive ? "live" : "→ jump to live"}
                </button>
              </div>
              <Slider
                value={[idx]}
                min={0}
                max={liveIdx}
                step={1}
                onValueChange={([v]) => setScrub(v >= liveIdx ? null : v)}
              />
            </div>
          ) : null}
          <div className="pt-1">
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
      Arb-free ✓
    </Verdict>
  ) : (
    <Verdict tone="breach" sub={`${bf.violations.length} butterfly violations`}>
      Butterfly ✕
    </Verdict>
  );
}
