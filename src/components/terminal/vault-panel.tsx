"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useLpFlow,
  useOracleState,
  useVaultPerformance,
  useVaultSummary,
} from "@/lib/indexer/hooks";
import { fmtPct, fmtUsdCompact, fromUnits } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { decodeSvi, impliedVol, yearsToExpiry } from "@/lib/svi";
import { FlashValue } from "./flash-value";
import { LabelTip } from "./label-tip";
import { useMarket } from "./market-context";
import { Panel } from "./panel";
import { PanelState } from "./panel-state";
import { Sparkline } from "./sparkline";
import { Meter, Stat, StatTile, TileGrid } from "./stat";
import { PerfChart } from "./vault/perf-chart";
import { VaultStress } from "./vault/vault-stress";

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

export function VaultPanel({ className }: { className?: string }) {
  const { data, isLoading, isError } = useVaultSummary();
  const { data: perf } = useVaultPerformance();
  const { selectedOracleId } = useMarket();
  const { data: oracleState } = useOracleState(selectedOracleId);
  const lp = useLpFlow();

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
      title="Vault"
      code="dUSDC"
      className={className}
      // At lg the desk is fixed-height: don't scroll the whole 3-column body as
      // one unit (that clipped the bottom). Each column scrolls on its own below.
      bodyClassName="lg:overflow-hidden"
      right={
        data ? (
          <FlashValue
            value={data.plp_share_price}
            className="text-data tabular text-text-dim"
          >
            PLP ${data.plp_share_price.toFixed(4)}
          </FlashValue>
        ) : null
      }
    >
      {isError ? (
        <PanelState kind="error">Vault feed unreachable</PanelState>
      ) : isLoading || !data ? (
        <div className="grid h-full min-h-0 grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-[1.1fr_1.2fr_0.9fr]">
          <div className="flex min-h-0 flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-md bg-panel-elev" />
            <Skeleton className="h-1 w-full rounded-full bg-panel-elev" />
            <div className="space-y-1.5 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3.5 bg-panel-elev" />
              ))}
            </div>
            <Skeleton className="mt-1 h-16 w-full bg-panel-elev" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24 bg-panel-elev" />
            <Skeleton className="min-h-[90px] flex-1 bg-panel-elev" />
            <Skeleton className="h-6 w-full bg-panel-elev" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3.5 bg-panel-elev" />
            <Skeleton className="h-1 rounded-full bg-panel-elev" />
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-hairline bg-hairline">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5 bg-panel px-3 py-2">
                  <Skeleton className="h-2.5 w-12 bg-panel-elev" />
                  <Skeleton className="h-4 w-14 bg-panel-elev" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid h-full min-h-0 grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-[1.1fr_1.2fr_0.9fr] 2xl:gap-y-4">
          <div className="min-h-0 lg:overflow-y-auto">
            <VaultStress
              availLiq={data.available_liquidity}
              maxPayout={data.total_max_payout}
              mtm={data.total_mtm}
              spot={spot}
              atmIV={atmIV}
            />
          </div>

          <div className="flex min-h-0 flex-col lg:overflow-y-auto">
            <div className="mb-1 flex items-baseline justify-between">
              <LabelTip k="plp-share-price" className="label-micro">PLP share price</LabelTip>
              {apy != null ? (
                <span className="text-data tabular text-safe">
                  <LabelTip k="apy">APY</LabelTip> {apy.toFixed(1)}%
                </span>
              ) : null}
            </div>
            <div className="min-h-[90px] flex-1 2xl:min-h-[120px]">
              {perfData.length ? (
                <PerfChart data={perfData} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="label-micro text-text-dim">
                    Loading history…
                  </span>
                </div>
              )}
            </div>
            {lp.series.length >= 2 ? (
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <LabelTip k="lp-net-flow" className="label-micro shrink-0">LP net flow</LabelTip>
                  <span className="min-w-0 truncate text-right text-data tabular text-text-dim">
                    {lp.supplyCount}↑ {lp.withdrawCount}↓ · net{" "}
                    {fmtUsdCompact(fromUnits(lp.net, DUSDC_DECIMALS))}
                  </span>
                </div>
                <Sparkline values={lp.series} />
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col gap-2 lg:overflow-y-auto 2xl:gap-3">
            <div>
              <Stat label="Utilization" tip="utilization" value={fmtPct(data.utilization)} />
              <Meter value={data.utilization} tone="accent" />
            </div>
            <div>
              <Stat
                label="Max payout util"
                tip="max-payout-util"
                value={fmtPct(data.max_payout_utilization)}
              />
              <Meter value={data.max_payout_utilization} tone="warn" />
            </div>
            <TileGrid cols={2}>
              <StatTile
                label="Vault value"
                tip="vault-value"
                value={fmtUsdCompact(fromUnits(data.vault_value, DUSDC_DECIMALS))}
              />
              <StatTile
                label="Available liq"
                tip="available-liq"
                value={fmtUsdCompact(
                  fromUnits(data.available_liquidity, DUSDC_DECIMALS),
                )}
              />
              <StatTile
                label="Max payout"
                tip="max-payout"
                value={fmtUsdCompact(
                  fromUnits(data.total_max_payout, DUSDC_DECIMALS),
                )}
                tone="warn"
              />
              <StatTile
                label="Net deposits"
                tip="net-deposits"
                value={fmtUsdCompact(
                  fromUnits(data.net_deposits, DUSDC_DECIMALS),
                )}
              />
              <StatTile
                label="Supplied"
                tip="supplied"
                value={fmtUsdCompact(
                  fromUnits(data.total_supplied, DUSDC_DECIMALS),
                )}
                tone="safe"
              />
              <StatTile
                label="Withdrawn"
                tip="withdrawn"
                value={fmtUsdCompact(
                  fromUnits(data.total_withdrawn, DUSDC_DECIMALS),
                )}
                tone="dim"
              />
              <StatTile
                label="Total MtM"
                tip="total-mtm"
                value={fmtUsdCompact(fromUnits(data.total_mtm, DUSDC_DECIMALS))}
              />
              <StatTile
                label="PLP supply"
                tip="plp-supply"
                value={fmtUsdCompact(
                  fromUnits(data.plp_total_supply, DUSDC_DECIMALS),
                )}
                tone="dim"
              />
            </TileGrid>
          </div>
        </div>
      )}
    </Panel>
  );
}
