"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useSviLatest } from "@/lib/indexer/hooks";
import { useNow } from "@/lib/use-now";
import { truncateAddr } from "@/lib/format";
import { decodeSvi } from "@/lib/svi";
import { Panel } from "./panel";
import { Stat } from "./stat";

export function OraclePanel() {
  const { data, isLoading, isError } = useSviLatest();
  const p = data ? decodeSvi(data) : null;

  // Live "feed age" clock (second resolution).
  const now = useNow();
  const ageS =
    data && now > 0
      ? Math.max(0, Math.round((now - data.checkpoint_timestamp_ms) / 1000))
      : null;

  return (
    <Panel title="ORACLE STATE" code="SVI params">
      {isError ? (
        <p className="label-micro text-breach">oracle feed unreachable</p>
      ) : isLoading || !data || !p ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full bg-panel-elev" />
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <Stat label="oracle" value={truncateAddr(data.oracle_id, 8, 6)} tone="dim" />
          <Stat label="a" value={p.a.toExponential(3)} />
          <Stat label="b" value={p.b.toExponential(3)} />
          <Stat label="ρ rho" value={p.rho.toFixed(4)} tone={p.rho < 0 ? "warn" : "default"} />
          <Stat label="m" value={p.m.toFixed(5)} />
          <Stat label="σ sigma" value={p.sigma.toFixed(5)} />
          <div className="mt-2 border-t border-hairline pt-2">
            <Stat label="checkpoint" value={data.checkpoint.toLocaleString()} tone="dim" />
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
