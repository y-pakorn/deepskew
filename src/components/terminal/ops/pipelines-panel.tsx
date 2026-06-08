"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useIndexerStatus } from "@/lib/indexer/hooks";
import { cn } from "@/lib/utils";
import { LabelTip } from "../label-tip";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";

const LAG_SCALE = 30; // seconds the bar fills toward

/** The indexer's event-ingest pipelines, sorted by how far each is behind the
 *  chain head. The bar makes "all caught up" obvious; names are detail. */
export function PipelinesPanel({ className }: { className?: string }) {
  const { data, isError } = useIndexerStatus();
  const pipelines = (data?.pipelines ?? [])
    .filter((p) => !p.is_backfill)
    .sort((a, b) => b.time_lag_seconds - a.time_lag_seconds);

  return (
    <Panel
      title="Indexer Pipelines"
      code="Lag behind chain head"
      className={className}
      bodyClassName="flex flex-col overflow-hidden p-0"
      right={
        <span className="label-micro text-text-faint">
          <span className="tabular">{pipelines.length}</span> streams
        </span>
      }
    >
      {isError ? (
        <PanelState kind="error">Status feed unreachable</PanelState>
      ) : !pipelines.length ? (
        <PanelState kind="empty">Loading pipelines…</PanelState>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_8.5rem] items-center gap-3 border-b border-hairline px-3 py-1.5">
            <LabelTip k="pipeline-lag" className="label-micro">
              Event pipeline
            </LabelTip>
            <span className="label-micro text-right">Lag behind head</span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {pipelines.map((p) => {
              const frac = Math.min(1, p.time_lag_seconds / LAG_SCALE);
              const ok = p.time_lag_seconds < 10;
              const warn = p.time_lag_seconds < 60;
              const tone = ok
                ? "text-safe"
                : warn
                  ? "text-warn"
                  : "text-breach";
              const bar = ok ? "bg-safe" : warn ? "bg-warn" : "bg-breach";
              return (
                <div
                  key={p.pipeline}
                  className="grid grid-cols-[1fr_8.5rem] items-center gap-3 border-b border-hairline/40 px-3 py-2 text-data tabular"
                >
                  <span className="truncate text-text-sec">{p.pipeline}</span>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-panel-elev">
                      <div
                        className={cn("h-full rounded-full", bar)}
                        style={{ width: `${Math.max(4, frac * 100)}%` }}
                      />
                    </div>
                    <span className={cn("w-7 text-right", tone)}>
                      {p.time_lag_seconds}s
                    </span>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </>
      )}
    </Panel>
  );
}
