"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useOracleState,
  useSpotHistory,
  useTermStructure,
} from "@/lib/indexer/hooks";
import {
  fmtAge,
  fmtCompact,
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
import { LabelTip } from "./label-tip";
import { useMarket } from "./market-context";
import { Panel } from "./panel";
import { PanelState } from "./panel-state";
import { Pill, type PillTone } from "./pill";
import { Sparkline } from "./sparkline";
import { MonoValue, Stat, StatTile, TileGrid } from "./stat";
import { TextSwap } from "./text-swap";

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
      title="Oracle State"
      code="SVI params"
      right={oracle ? <StatusChip status={oracle.status} /> : null}
    >
      {!selectedOracleId ? (
        <PanelState kind="empty">No active market</PanelState>
      ) : isError ? (
        <PanelState kind="error">Oracle feed unreachable</PanelState>
      ) : isLoading || !data || !oracle ? (
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-8 w-32 bg-panel-elev" />
            <Skeleton className="h-3 w-8 bg-panel-elev" />
          </div>
          <Skeleton className="h-4 w-full bg-panel-elev" />
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-hairline bg-hairline">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5 bg-panel px-3 py-2">
                <Skeleton className="h-2.5 w-12 bg-panel-elev" />
                <Skeleton className="h-4 w-16 bg-panel-elev" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1 border-t border-hairline pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 bg-panel-elev" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 border-t border-hairline pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 bg-panel-elev" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-2 2xl:gap-3">
          <div>
            <div className="flex items-baseline justify-between">
              {price ? (
                <FlashValue
                  value={price.spot}
                  className="text-hero font-medium tracking-tight text-foreground"
                >
                  <MonoValue pop>{fmtPrice(price.spot)}</MonoValue>
                </FlashValue>
              ) : (
                <span className="text-hero font-medium tabular text-foreground">
                  —
                </span>
              )}
              <LabelTip k="spot" className="label-micro">
                Spot
              </LabelTip>
            </div>
            {spots.length >= 2 ? (
              <div className="mt-2 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Sparkline values={spots} />
                </div>
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
              tip="forward"
              value={price ? fmtPrice(price.forward) : "—"}
            />
            <StatTile
              label="Expiry"
              tip="expiry"
              value={oracle.status === "settled" ? "Settled" : fmtDuration(toExp)}
              tone={oracle.status === "settled" ? "warn" : "default"}
            />
            <StatTile
              label="ATM IV"
              tip="atm-iv"
              value={atmIV != null ? fmtPctValue(atmIV) : "—"}
              focal
            />
            <StatTile
              label="ATM var"
              tip="atm-var"
              value={atmVar != null ? atmVar.toExponential(2) : "—"}
            />
          </TileGrid>

          {p && T > 0 ? <VolMatrix p={p} T={T} /> : null}

          {term.length >= 2 ? (
            <div className="border-t border-hairline pt-2">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <LabelTip k="term-structure" className="label-micro min-w-0 truncate">
                  ATM IV term structure
                </LabelTip>
                <span className="shrink-0 whitespace-nowrap text-val tabular text-text-dim">
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

          <div className="mt-auto grid grid-cols-2 gap-x-4 border-t border-hairline pt-2">
            <Stat label="a" tip="svi-a" value={p ? p.a.toExponential(3) : "—"} />
            <Stat label="b" tip="svi-b" value={p ? p.b.toExponential(3) : "—"} />
            <Stat
              label="ρ rho"
              tip="svi-rho"
              value={p ? p.rho.toFixed(4) : "—"}
              tone={p && p.rho < 0 ? "warn" : "default"}
            />
            <Stat label="m" tip="svi-m" value={p ? p.m.toFixed(5) : "—"} />
            <Stat
              label="σ sigma"
              tip="svi-sigma"
              value={p ? p.sigma.toFixed(5) : "—"}
            />
            <Stat
              label="Checkpoint"
              tip="checkpoint"
              value={price ? fmtCompact(price.checkpoint) : "—"}
              tone="dim"
            />
            <Stat
              label="Oracle"
              tip="oracle-id"
              value={truncateAddr(oracle.oracle_id, 6, 4)}
              tone="dim"
            />
            <Stat
              label="Feed"
              tip="feed-age"
              value={ageS != null ? `▲ ${fmtAge(ageS * 1000)} ago` : "—"}
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
      <LabelTip k="vol-by-strike" className="label-micro">
        Vol by strike · IV
      </LabelTip>
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
    <Pill tone={tone} tip="oracle-status">
      <TextSwap>{status.charAt(0).toUpperCase() + status.slice(1)}</TextSwap>
    </Pill>
  );
}
