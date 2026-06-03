"use client";

import { useIndexerStatus } from "@/lib/indexer/hooks";
import { cn } from "@/lib/utils";
import { TextSwap } from "./text-swap";

/** ● live · lag Ns — driven by the indexer `/status` endpoint. */
export function LivePill() {
  const { data, isError, isLoading } = useIndexerStatus();
  const offline = isError;
  const ok = !offline && data?.status === "OK";
  const lag = data?.max_time_lag_seconds;

  const dot = offline ? "bg-breach" : ok ? "bg-safe" : "bg-warn";
  const text = offline ? "Offline" : isLoading && !data ? "Sync" : "Live";

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex size-1.5">
        {ok ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-safe/60" />
        ) : null}
        <span className={cn("relative inline-flex size-1.5 rounded-full", dot)} />
      </span>
      <TextSwap className="label-micro text-text-sec">{text}</TextSwap>
      {lag != null ? (
        <span className="text-data tabular text-text-dim">
          · Lag {lag}s
        </span>
      ) : null}
    </span>
  );
}
