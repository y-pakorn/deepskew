"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useOracleState,
  useSpotHistory,
  useTermStructure,
} from "@/lib/indexer/hooks";
import {
  fmtDuration,
  fmtPctValue,
  fmtPrice,
  fmtSigned,
  truncateAddr,
} from "@/lib/format";
import {
  decodeSvi,
  impliedVol,
  totalVariance,
  yearsToExpiry,
  type SviParams,
} from "@/lib/svi";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { FlashValue } from "./flash-value";
import { useMarket } from "./market-context";
import { Panel } from "./panel";
import { Pill, type PillTone } from "./pill";
import { Sparkline } from "./sparkline";
import { MonoValue, Stat, StatTile, TileGrid } from "./stat";

const MATRIX_K = [-0.2, -0.1, 0, 0.1, 0.2];

export function OraclePanel() {
  const { selectedOracleId } = useMarket();
  const { data, isLoading, isError } = useOracleState(selectedOracleId);
  const { data: spotHist = [] } = useSpotHistory(selectedOracleId);
  const { rows: term } = useTermStructure();
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
      title="Oracle state"
      code="SVI params"
      right={oracle ? <StatusChip status={oracle.status} /> : null}
    >
      {!selectedOracleId ? (
        <p className="label-micro text-text-dim">No active market</p>
      ) : isError ? (
        <p className="label-micro text-breach">Oracle feed unreachable</p>
      ) : isLoading || !data || !oracle ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/2 bg-panel-elev" />
          <Skeleton className="h-7 w-full bg-panel-elev" />
          {Array.from({ length: 6 }).map((_, i) => (
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
                  className="text-hero font-medium tracking-tight text-foreground"
                >
                  <MonoValue>{fmtPrice(price.spot)}</MonoValue>
                </FlashValue>
              ) : (
                <span className="text-hero font-medium tabular text-foreground">
                  —
                </span>
              )}
              <span className="label-micro">Spot</span>
            </div>
            {spots.length >= 2 ? (
              <div className="mt-2 flex items-center gap-3">
                <Sparkline values={spots} />
                <span
                  className={cn(
                    "shrink-0 text-val tabular",
                    (spotChange ?? 0) >= 0 ? "text-safe" : "text-breach",
                  )}
                >
                  {spotChange != null ? `${fmtSigned(spotChange, 2)}%` : ""}
                </span>
              </div>
            ) : null}
          </div>

          <TileGrid cols={2}>
            <StatTile
              label="Forward"
              value={price ? fmtPrice(price.forward) : "—"}
            />
            <StatTile
              label="Expiry"
              value={oracle.status === "settled" ? "Settled" : fmtDuration(toExp)}
              tone={oracle.status === "settled" ? "warn" : "default"}
            />
            <StatTile
              label="ATM IV"
              value={atmIV != null ? fmtPctValue(atmIV) : "—"}
              focal
            />
            <StatTile
              label="ATM var"
              value={atmVar != null ? atmVar.toExponential(2) : "—"}
            />
          </TileGrid>

          {p && T > 0 ? <VolMatrix p={p} T={T} /> : null}

          {term.length >= 2 ? (
            <div className="border-t border-hairline pt-2">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="label-micro">ATM IV term structure</span>
                <span className="text-val tabular text-text-dim">
                  {(term[0].atmIV * 100).toFixed(0)}% →{" "}
                  {(term.at(-1)!.atmIV * 100).toFixed(0)}%
                </span>
              </div>
              <Sparkline values={term.map((r) => r.atmIV)} />
              <div className="mt-0.5 flex justify-between">
                <span className="label-micro text-text-faint">
                  {fmtDuration(term[0].expiry - now)}
                </span>
                <span className="label-micro text-text-faint">
                  {fmtDuration(term.at(-1)!.expiry - now)}
                </span>
              </div>
            </div>
          ) : null}

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
              label="Checkpoint"
              value={price ? price.checkpoint.toLocaleString() : "—"}
              tone="dim"
            />
          </div>

          <div className="mt-auto grid grid-cols-2 gap-x-5 border-t border-hairline pt-2">
            <Stat
              label="Oracle"
              value={truncateAddr(oracle.oracle_id, 6, 4)}
              tone="dim"
            />
            <Stat
              label="Feed"
              value={ageS != null ? `▲ ${ageS}s ago` : "—"}
              tone={ageS != null && ageS < 120 ? "safe" : "warn"}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}

function VolMatrix({ p, T }: { p: SviParams; T: number }) {
  return (
    <div className="border-t border-hairline pt-2">
      <span className="label-micro">Vol by strike · IV</span>
      <div className="mt-2 grid grid-cols-5 gap-1 text-center">
        {MATRIX_K.map((k) => {
          const iv = impliedVol(k, p, T) * 100;
          const atm = k === 0;
          return (
            <div key={k}>
              <div className="label-micro text-text-faint">
                {atm ? "ATM" : `${k > 0 ? "+" : ""}${(k * 100).toFixed(0)}`}
              </div>
              <div
                className={cn(
                  "text-val tabular",
                  atm ? "text-foreground" : "text-text-sec",
                )}
              >
                {iv.toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone: PillTone =
    status === "active" ? "up" : status === "settled" ? "neutral" : "warn";
  return (
    <Pill tone={tone}>{status.charAt(0).toUpperCase() + status.slice(1)}</Pill>
  );
}
