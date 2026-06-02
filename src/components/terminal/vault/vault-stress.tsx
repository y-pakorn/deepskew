"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { fmtNum, fmtPrice, fmtUsdCompact, fromUnits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Stat, Verdict } from "../stat";

/**
 * ±Nσ PLP stress simulator. Sizes a 1-day N-σ BTC shock from the live ATM IV,
 * then models the vault's payout (bounded by max-payout, since Predict payouts
 * are capped) and the resulting liquidity buffer. Quote amounts are 1e6-scaled.
 */
export function VaultStress({
  availLiq,
  maxPayout,
  mtm,
  spot,
  atmIV,
}: {
  availLiq: number;
  maxPayout: number;
  mtm: number;
  spot: number | null;
  atmIV: number;
}) {
  const [sigma, setSigma] = useState(5);

  const moveFrac = atmIV * Math.sqrt(1 / 365.25) * sigma; // 1-day N-σ move
  const stressedSpot = spot != null ? spot * (1 - moveFrac) : null;

  const mtmFrac = maxPayout > 0 ? Math.min(1, Math.max(0, mtm / maxPayout)) : 0;
  const payoutFrac = mtmFrac + (1 - mtmFrac) * (1 - Math.exp(-sigma / 2.5));
  const stressedPayout = maxPayout * payoutFrac;
  const buffer = stressedPayout > 0 ? availLiq / stressedPayout : Infinity;
  const tone = buffer >= 2 ? "safe" : buffer >= 1 ? "warn" : "breach";
  const sigmaLabel = Number.isInteger(sigma) ? `${sigma}` : sigma.toFixed(1);

  const scenario = (s: number) => {
    const move = atmIV * Math.sqrt(1 / 365.25) * s;
    const pf = mtmFrac + (1 - mtmFrac) * (1 - Math.exp(-s / 2.5));
    const buf = maxPayout * pf > 0 ? availLiq / (maxPayout * pf) : Infinity;
    return { move, buf };
  };
  const LADDER = [1, 2, 3, 5];

  return (
    <div className="flex flex-col gap-3">
      <Verdict
        tone={tone}
        sub={
          <>
            ±<span className="tabular">{sigmaLabel}</span>σ · 1-day shock ·
            payouts capped
          </>
        }
      >
        {buffer >= 1 ? (
          <>
            Survives <span className="tabular">{sigmaLabel}</span>σ ·{" "}
            <span className="tabular">
              {Number.isFinite(buffer)
                ? fmtNum(buffer, buffer >= 100 ? 0 : 1)
                : "∞"}
            </span>
            × buffer
          </>
        ) : (
          <>
            Breach at <span className="tabular">{sigmaLabel}</span>σ
          </>
        )}
      </Verdict>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label-micro">Stress ±σ</span>
          <span className="text-data tabular text-text-sec">
            {sigma.toFixed(1)}σ
          </span>
        </div>
        <Slider
          value={[sigma]}
          min={0}
          max={6}
          step={0.5}
          onValueChange={([v]) => setSigma(v)}
        />
      </div>
      <div>
        <Stat
          label="σ-move"
          value={`−${(moveFrac * 100).toFixed(1)}%`}
          tone="warn"
        />
        {stressedSpot != null ? (
          <Stat label="BTC →" value={fmtPrice(stressedSpot)} />
        ) : null}
        <Stat
          label="Modeled payout"
          value={fmtUsdCompact(fromUnits(stressedPayout, DUSDC_DECIMALS))}
        />
        <Stat
          label="Available"
          value={fmtUsdCompact(fromUnits(availLiq, DUSDC_DECIMALS))}
          tone="safe"
        />
      </div>

      <div className="border-t border-hairline pt-2">
        <div className="mb-1 grid grid-cols-3 label-micro">
          <span>Shock</span>
          <span className="text-right">Move</span>
          <span className="text-right">Buffer</span>
        </div>
        <div className="space-y-0.5">
          {LADDER.map((s) => {
            const sc = scenario(s);
            return (
              <div
                key={s}
                className="grid grid-cols-3 text-data tabular"
              >
                <span className="text-text-dim">{s}σ</span>
                <span className="text-right text-warn">
                  −{(sc.move * 100).toFixed(1)}%
                </span>
                <span
                  className={cn(
                    "text-right",
                    sc.buf >= 2
                      ? "text-safe"
                      : sc.buf >= 1
                        ? "text-warn"
                        : "text-breach",
                  )}
                >
                  {Number.isFinite(sc.buf) ? `${fmtNum(sc.buf, 0)}×` : "∞"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
