"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { useVaultSummary } from "@/lib/indexer/hooks";
import { fmtNum, fmtPct, fmtUsdCompact, fromUnits } from "@/lib/format";
import { Panel } from "./panel";
import { Meter, Stat, Verdict } from "./stat";

export function VaultPanel({ className }: { className?: string }) {
  const { data, isLoading, isError } = useVaultSummary();

  // Tail buffer: how many times the current max payout fits inside vault value.
  // A real ±5σ stress sim lands in the Vault room (Days 9–13); this is the
  // live max-payout headroom, the honest current proxy.
  const buffer =
    data && data.max_payout_utilization > 0
      ? 1 / data.max_payout_utilization
      : Infinity;

  return (
    <Panel
      title="VAULT · PLP RISK"
      code="dUSDC"
      className={className}
      right={
        data ? (
          <span className="font-mono text-[11px] tabular text-text-dim">
            PLP ${data.plp_share_price.toFixed(4)}
          </span>
        ) : null
      }
    >
      {isError ? (
        <p className="label-micro text-breach">vault feed unreachable</p>
      ) : isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 w-full bg-panel-elev" />
          <Skeleton className="h-16 w-full bg-panel-elev" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Verdict
              tone={Number.isFinite(buffer) && buffer >= 3 ? "safe" : "warn"}
              sub="max-payout tail buffer · ±5σ sim in Vault room"
            >
              {Number.isFinite(buffer)
                ? `SAFE · ${fmtNum(buffer, 0)}× BUFFER`
                : "SAFE · no open risk"}
            </Verdict>
            <div className="space-y-2">
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
            </div>
          </div>
          <div className="flex flex-col justify-center">
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
              label="total MtM"
              value={fmtUsdCompact(fromUnits(data.total_mtm, DUSDC_DECIMALS))}
            />
            <Stat
              label="PLP supply"
              value={fmtUsdCompact(
                fromUnits(data.plp_total_supply, DUSDC_DECIMALS),
              )}
              tone="dim"
            />
          </div>
        </div>
      )}
    </Panel>
  );
}
