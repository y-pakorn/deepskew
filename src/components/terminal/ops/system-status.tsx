"use client";

import { useMemo } from "react";
import {
  useActiveOracleMarks,
  useIndexerStatus,
  usePredictConfig,
} from "@/lib/indexer/hooks";
import { fmtCompact } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { LabelTip } from "../label-tip";
import { MonoValue, type Tone, toneClass } from "../stat";

const STALE_MS = 30_000;

const dotClass = (t: Tone) =>
  ({
    default: "bg-text-dim",
    safe: "bg-safe",
    warn: "bg-warn",
    breach: "bg-breach",
    accent: "bg-accent-brand",
    key: "bg-accent-brand",
    dim: "bg-text-faint",
  })[t];

/** The system-status header for Ops — answers "is everything OK?" at a glance:
 *  a top-level verdict over four status cards (feeds, indexer, trading, head). */
export function SystemStatus() {
  const { marks } = useActiveOracleMarks();
  const { data: status, isError } = useIndexerStatus();
  const { data: config } = usePredictConfig();
  const now = useNow();

  const feeds = useMemo(() => {
    let fresh = 0;
    let bad = 0;
    for (const m of marks.values()) {
      const age = m.lastUpdateMs > 0 ? now - m.lastUpdateMs : Infinity;
      if (m.expiry <= now || age > STALE_MS) bad += 1;
      else fresh += 1;
    }
    return { fresh, bad, total: marks.size };
  }, [marks, now]);

  const ok = !isError && status?.status === "OK";
  const paused = config?.trading_paused === true;
  const lag = status?.max_time_lag_seconds;
  const overall = paused
    ? { label: "Trading paused", tone: "breach" as const }
    : feeds.bad > 0
      ? {
          label: `${feeds.bad} oracle feed${feeds.bad > 1 ? "s" : ""} degraded`,
          tone: "warn" as const,
        }
      : !ok
        ? { label: "Indexer syncing", tone: "warn" as const }
        : { label: "All systems operational", tone: "safe" as const };

  return (
    <div className="shrink-0 border-b border-hairline bg-panel">
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5">
        <span className={cn("size-2 shrink-0 rounded-full", dotClass(overall.tone))} />
        <span
          className={cn(
            "text-lead leading-none font-medium",
            toneClass(overall.tone),
          )}
        >
          {overall.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-hairline bg-hairline lg:grid-cols-4">
        <Card
          k="feed-staleness"
          label="Oracle feeds"
          value={`${feeds.fresh}/${feeds.total || "—"}`}
          sub="Fresh · 30s window"
          tone={feeds.bad > 0 ? "warn" : "safe"}
        />
        <Card
          k="lag"
          label="Indexer lag"
          value={lag != null ? `${lag}s` : "—"}
          sub={ok ? "Caught up to chain" : "Syncing"}
          tone={ok ? "safe" : "warn"}
        />
        <Card
          k="kill-switch"
          label="Trading"
          value={paused ? "Paused" : "Live"}
          sub="Kill-switch"
          tone={paused ? "breach" : "safe"}
        />
        <Card
          k="checkpoint"
          label="Checkpoint"
          value={status ? fmtCompact(status.latest_onchain_checkpoint) : "—"}
          sub="Chain head"
          tone="default"
        />
      </div>
    </div>
  );
}

function Card({
  k,
  label,
  value,
  sub,
  tone,
}: {
  k: string;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
}) {
  return (
    <div className="flex flex-col gap-1 bg-panel px-4 py-2.5">
      <LabelTip k={k} className="label-micro">
        {label}
      </LabelTip>
      <MonoValue
        className={cn("text-lead leading-none font-medium", toneClass(tone))}
      >
        {value}
      </MonoValue>
      <span className="label-micro text-text-faint">{sub}</span>
    </div>
  );
}
