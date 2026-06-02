"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useOracleState,
  useVaultPerformance,
  useVaultSummary,
} from "@/lib/indexer/hooks";
import { fmtPct, fmtUsdCompact, fromUnits } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { decodeSvi, impliedVol, yearsToExpiry } from "@/lib/svi";
import { FlashValue } from "./flash-value";
import { useMarket } from "./market-context";
import { Panel } from "./panel";
import { Meter, Stat } from "./stat";
import { PerfChart } from "./vault/perf-chart";
import { VaultStress } from "./vault/vault-stress";

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

export function VaultPanel({ className }: { className?: string }) {
  const { data, isLoading, isError } = useVaultSummary();
  const { data: perf } = useVaultPerformance();
  const { selectedOracleId } = useMarket();
  const { data: oracleState } = useOracleState(selectedOracleId);

  // ATM IV (annualized) + spot from the selected oracle — for the σ-shock.
  const svi = oracleState?.latest_svi;
  const expiry = oracleState?.oracle.expiry;
  let atmIV = 0.45;
  if (svi && expiry != null) {
    const T = yearsToExpiry(expiry, svi.checkpoint_timestamp_ms);
    if (T > 0) atmIV = impliedVol(0, decodeSvi(svi), T);
  }
  const spot = oracleState?.latest_price?.spot ?? null;

  // Sort + collapse to one point per second (lightweight-charts requires
  // strictly ascending, unique times; the feed has same-second duplicates).
  const perfData = (() => {
    const pts = [...(perf?.points ?? [])].sort(
      (a, b) => a.timestamp_ms - b.timestamp_ms,
    );
    const bySecond = new Map<number, number>();
    for (const p of pts) {
      bySecond.set(Math.floor(p.timestamp_ms / 1000), p.share_price);
    }
    return [...bySecond.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([time, value]) => ({ time, value }));
  })();
  const apy = (() => {
    const pts = perf?.points ?? [];
    if (pts.length < 2) return null;
    const a = pts[0];
    const b = pts[pts.length - 1];
    const years = (b.timestamp_ms - a.timestamp_ms) / MS_PER_YEAR;
    if (years <= 0 || a.share_price <= 0) return null;
    return ((b.share_price / a.share_price - 1) / years) * 100;
  })();

  return (
    <Panel
      title="VAULT · PLP RISK"
      code="dUSDC"
      className={className}
      right={
        data ? (
          <FlashValue
            value={data.plp_share_price}
            className="font-mono text-[11px] tabular text-text-dim"
          >
            PLP ${data.plp_share_price.toFixed(4)}
          </FlashValue>
        ) : null
      }
    >
      {isError ? (
        <p className="label-micro text-breach">vault feed unreachable</p>
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full bg-panel-elev" />
          <Skeleton className="h-24 w-full bg-panel-elev" />
          <Skeleton className="h-24 w-full bg-panel-elev" />
        </div>
      ) : (
        <div className="grid h-full grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-[1.1fr_1.2fr_0.9fr]">
          <VaultStress
            availLiq={data.available_liquidity}
            maxPayout={data.total_max_payout}
            mtm={data.total_mtm}
            spot={spot}
            atmIV={atmIV}
          />

          <div className="flex min-h-0 flex-col">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="label-micro">PLP share price</span>
              {apy != null ? (
                <span className="font-mono text-[11px] tabular text-safe">
                  APY {apy.toFixed(1)}%
                </span>
              ) : null}
            </div>
            <div className="min-h-[90px] flex-1">
              {perfData.length ? (
                <PerfChart data={perfData} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="label-micro text-text-dim">
                    loading history…
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-2.5">
            <div>
              <Stat label="utilization" value={fmtPct(data.utilization)} />
              <Meter value={data.utilization} tone="accent" />
            </div>
            <div>
              <Stat
                label="max payout util"
                value={fmtPct(data.max_payout_utilization)}
              />
              <Meter value={data.max_payout_utilization} tone="warn" />
            </div>
            <div className="space-y-0.5 border-t border-hairline pt-2">
              <Stat
                label="vault value"
                value={fmtUsdCompact(fromUnits(data.vault_value, DUSDC_DECIMALS))}
              />
              <Stat
                label="available liq"
                value={fmtUsdCompact(
                  fromUnits(data.available_liquidity, DUSDC_DECIMALS),
                )}
              />
              <Stat
                label="max payout"
                value={fmtUsdCompact(
                  fromUnits(data.total_max_payout, DUSDC_DECIMALS),
                )}
                tone="warn"
              />
              <Stat
                label="net deposits"
                value={fmtUsdCompact(
                  fromUnits(data.net_deposits, DUSDC_DECIMALS),
                )}
              />
              <Stat
                label="supplied"
                value={fmtUsdCompact(
                  fromUnits(data.total_supplied, DUSDC_DECIMALS),
                )}
                tone="safe"
              />
              <Stat
                label="withdrawn"
                value={fmtUsdCompact(
                  fromUnits(data.total_withdrawn, DUSDC_DECIMALS),
                )}
                tone="dim"
              />
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
