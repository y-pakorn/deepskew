"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useOracleState, useSpotHistory } from "@/lib/indexer/hooks";
import {
  fmtDuration,
  fmtPctValue,
  fmtPrice,
  fmtSigned,
  truncateAddr,
} from "@/lib/format";
import { decodeSvi, impliedVol, totalVariance, yearsToExpiry } from "@/lib/svi";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { FlashValue } from "./flash-value";
import { useMarket } from "./market-context";
import { Panel } from "./panel";
import { Sparkline } from "./sparkline";
import { Stat } from "./stat";

export function OraclePanel() {
  const { selectedOracleId } = useMarket();
  const { data, isLoading, isError } = useOracleState(selectedOracleId);
  const { data: spotHist = [] } = useSpotHistory(selectedOracleId);
  const now = useNow();

  const oracle = data?.oracle;
  const price = data?.latest_price ?? null;
  const svi = data?.latest_svi ?? null;
  const p = svi ? decodeSvi(svi) : null;
  const ageS =
    price && now > 0
      ? Math.max(0, Math.round((now - price.checkpoint_timestamp_ms) / 1000))
      : null;
  const toExp = oracle ? oracle.expiry - now : 0;

  const spots = spotHist.map((s) => s.spot);
  const spotChange =
    spots.length >= 2 ? ((spots.at(-1)! - spots[0]) / spots[0]) * 100 : null;

  const T =
    oracle && svi ? yearsToExpiry(oracle.expiry, svi.checkpoint_timestamp_ms) : 0;
  const atmIV = p && T > 0 ? impliedVol(0, p, T) * 100 : null;
  const atmVar = p ? totalVariance(0, p) : null;

  return (
    <Panel
      title="ORACLE STATE"
      code="SVI params"
      right={oracle ? <StatusChip status={oracle.status} /> : null}
    >
      {!selectedOracleId ? (
        <p className="label-micro text-text-dim">no active market</p>
      ) : isError ? (
        <p className="label-micro text-breach">oracle feed unreachable</p>
      ) : isLoading || !data || !oracle ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/2 bg-panel-elev" />
          <Skeleton className="h-7 w-full bg-panel-elev" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full bg-panel-elev" />
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col gap-3">
          <div>
            <div className="flex items-baseline justify-between">
              {price ? (
                <FlashValue
                  value={price.spot}
                  className="font-mono text-2xl tabular text-foreground"
                >
                  {fmtPrice(price.spot)}
                </FlashValue>
              ) : (
                <span className="font-mono text-2xl tabular text-foreground">
                  —
                </span>
              )}
              <span className="label-micro">spot</span>
            </div>
            {spots.length >= 2 ? (
              <div className="mt-1.5 flex items-center gap-3">
                <Sparkline values={spots} />
                <span
                  className={cn(
                    "shrink-0 font-mono text-[11px] tabular",
                    (spotChange ?? 0) >= 0 ? "text-safe" : "text-breach",
                  )}
                >
                  {spotChange != null ? `${fmtSigned(spotChange, 2)}%` : ""}
                </span>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-5 border-t border-hairline pt-2">
            <Stat label="forward" value={price ? fmtPrice(price.forward) : "—"} />
            <Stat
              label="expiry"
              value={oracle.status === "settled" ? "settled" : fmtDuration(toExp)}
              tone={oracle.status === "settled" ? "warn" : "default"}
            />
            <Stat
              label="ATM IV"
              value={atmIV != null ? fmtPctValue(atmIV) : "—"}
              tone="accent"
            />
            <Stat
              label="ATM var"
              value={atmVar != null ? atmVar.toExponential(2) : "—"}
            />
          </div>

          <div className="grid grid-cols-2 gap-x-5 border-t border-hairline pt-2">
            <Stat label="a" value={p ? p.a.toExponential(3) : "—"} />
            <Stat label="b" value={p ? p.b.toExponential(3) : "—"} />
            <Stat
              label="ρ rho"
              value={p ? p.rho.toFixed(4) : "—"}
              tone={p && p.rho < 0 ? "warn" : "default"}
            />
            <Stat label="m" value={p ? p.m.toFixed(5) : "—"} />
            <Stat label="σ sigma" value={p ? p.sigma.toFixed(5) : "—"} />
            <Stat
              label="checkpoint"
              value={price ? price.checkpoint.toLocaleString() : "—"}
              tone="dim"
            />
          </div>

          <div className="mt-auto grid grid-cols-2 gap-x-5 border-t border-hairline pt-2">
            <Stat
              label="oracle"
              value={truncateAddr(oracle.oracle_id, 6, 4)}
              tone="dim"
            />
            <Stat
              label="feed"
              value={ageS != null ? `▲ ${ageS}s ago` : "—"}
              tone={ageS != null && ageS < 120 ? "safe" : "warn"}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "text-safe"
      : status === "settled"
        ? "text-text-dim"
        : "text-warn";
  return <span className={`label-micro ${tone}`}>{status}</span>;
}
