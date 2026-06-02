"use client";

import { useIndexerStatus } from "@/lib/indexer/hooks";
import { cn } from "@/lib/utils";

/** ● live · lag Ns — driven by the indexer `/status` endpoint. */
export function LivePill() {
  const { data, isError, isLoading } = useIndexerStatus();
  const offline = isError;
  const ok = !offline && data?.status === "OK";
  const lag = data?.max_time_lag_seconds;

  const dot = offline ? "bg-breach" : ok ? "bg-safe" : "bg-warn";
  const text = offline ? "offline" : isLoading && !data ? "sync" : "live";

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex size-1.5">
        {ok ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-safe/60" />
        ) : null}
        <span className={cn("relative inline-flex size-1.5 rounded-full", dot)} />
      </span>
      <span className="label-micro text-text-sec">{text}</span>
      {lag != null ? (
        <span className="text-val tabular text-text-dim">
          · lag {lag}s
        </span>
      ) : null}
    </span>
  );
}
