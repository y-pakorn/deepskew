"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useOracleState } from "@/lib/indexer/hooks";
import { fmtDuration, fmtPrice, truncateAddr } from "@/lib/format";
import { decodeSvi } from "@/lib/svi";
import { useNow } from "@/lib/use-now";
import { FlashValue } from "./flash-value";
import { useMarket } from "./market-context";
import { Panel } from "./panel";
import { Stat } from "./stat";

export function OraclePanel() {
  const { selectedOracleId } = useMarket();
  const { data, isLoading, isError } = useOracleState(selectedOracleId);
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
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full bg-panel-elev" />
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="mb-2 flex items-baseline justify-between">
            {price ? (
              <FlashValue
                value={price.spot}
                className="font-mono text-lg tabular text-foreground"
              >
                {fmtPrice(price.spot)}
              </FlashValue>
            ) : (
              <span className="font-mono text-lg tabular text-foreground">
                —
              </span>
            )}
            <span className="label-micro">spot</span>
          </div>
          <Stat label="forward" value={price ? fmtPrice(price.forward) : "—"} />
          <Stat
            label="expiry"
            value={oracle.status === "settled" ? "settled" : fmtDuration(toExp)}
            tone={oracle.status === "settled" ? "warn" : "default"}
          />
          <div className="my-2 border-t border-hairline pt-2">
            {p ? (
              <>
                <Stat label="a" value={p.a.toExponential(3)} />
                <Stat label="b" value={p.b.toExponential(3)} />
                <Stat
                  label="ρ rho"
                  value={p.rho.toFixed(4)}
                  tone={p.rho < 0 ? "warn" : "default"}
                />
                <Stat label="m" value={p.m.toFixed(5)} />
                <Stat label="σ sigma" value={p.sigma.toFixed(5)} />
              </>
            ) : (
              <p className="label-micro text-text-dim">no SVI yet</p>
            )}
          </div>
          <div className="mt-auto border-t border-hairline pt-2">
            <Stat
              label="oracle"
              value={truncateAddr(oracle.oracle_id, 8, 6)}
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
