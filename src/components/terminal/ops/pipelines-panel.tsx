"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useIndexerStatus } from "@/lib/indexer/hooks";
import { cn } from "@/lib/utils";
import { LabelTip } from "../label-tip";
import {
  LightCard,
  LightFigures,
  LightNote,
  LightSubLabel,
} from "../light";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";
import { Verdict } from "../stat";

const LAG_SCALE = 30; // seconds the bar fills toward

type Pipeline = { pipeline: string; time_lag_seconds: number };

/** One lag-bar row — the same markup the Pro body renders, lifted out so the
 *  Light card can reuse it for a short slice. */
function LagRow({ p }: { p: Pipeline }) {
  const frac = Math.min(1, p.time_lag_seconds / LAG_SCALE);
  const ok = p.time_lag_seconds < 10;
  const warn = p.time_lag_seconds < 60;
  const tone = ok ? "text-safe" : warn ? "text-warn" : "text-breach";
  const bar = ok ? "bg-safe" : warn ? "bg-warn" : "bg-breach";
  return (
    <div className="grid grid-cols-[1fr_8.5rem] items-center gap-3 border-b border-hairline/40 px-3 py-2 text-data tabular">
      <span className="truncate text-text-sec">{p.pipeline}</span>
      <div className="flex items-center justify-end gap-2">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-panel-elev">
          <div
            className={cn("h-full rounded-full", bar)}
            style={{ width: `${Math.max(4, frac * 100)}%` }}
          />
        </div>
        <span className={cn("w-7 text-right", tone)}>{p.time_lag_seconds}s</span>
      </div>
    </div>
  );
}

/** The indexer's event-ingest pipelines, sorted by how far each is behind the
 *  chain head. The bar makes "all caught up" obvious; names are detail. */
export function PipelinesPanel({ className }: { className?: string }) {
  const { data, isError } = useIndexerStatus();
  const pipelines = (data?.pipelines ?? [])
    .filter((p) => !p.is_backfill)
    .sort((a, b) => b.time_lag_seconds - a.time_lag_seconds);

  const worst = pipelines[0]?.time_lag_seconds ?? 0;
  const caughtUp = pipelines.filter((p) => p.time_lag_seconds < 10).length;
  const worstTone = worst < 10 ? "safe" : worst < 60 ? "warn" : "breach";

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
      light={
        !isError && pipelines.length ? (
          <LightCard>
            <Verdict tone={worstTone} wrap tip="indexer-status">
              {worst < 10
                ? "The data feed is caught up to the chain."
                : `Data is ${worst}s behind the chain.`}
            </Verdict>
            <div className="-mx-3 shrink-0">
              <LightSubLabel tip="pipeline-lag">
                How far each stream is behind
              </LightSubLabel>
              <div className="mt-1.5 border-t border-hairline/40">
                {pipelines.slice(0, 6).map((p) => (
                  <LagRow key={p.pipeline} p={p} />
                ))}
              </div>
            </div>
            <LightFigures
              items={[
                { label: "Data streams", value: String(pipelines.length) },
                {
                  label: "Worst lag",
                  value: `${worst}s`,
                  tone: worstTone,
                  tip: "lag",
                },
                {
                  label: "Caught up",
                  value: `${caughtUp}/${pipelines.length}`,
                },
              ]}
            />
            <LightNote>
              Each bar is one data stream reading the chain; short green bars
              mean it is keeping up in near real time.
            </LightNote>
          </LightCard>
        ) : null
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
            {pipelines.map((p) => (
              <LagRow key={p.pipeline} p={p} />
            ))}
          </ScrollArea>
        </>
      )}
    </Panel>
  );
}
