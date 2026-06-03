"use client";

import { useIndexerStatus } from "@/lib/indexer/hooks";
import { cn } from "@/lib/utils";
import { useMarket } from "./market-context";
import { TextSwap } from "./text-swap";

/** ● live · lag Ns — the ping means the on-chain push channel is connected;
 *  the dot/word + lag come from the indexer `/status` poll. */
export function LivePill() {
  const { data, isError, isLoading } = useIndexerStatus();
  const { liveStatus } = useMarket();
  const offline = isError;
  const ok = !offline && data?.status === "OK";
  const lag = data?.max_time_lag_seconds;
  const chainLive = liveStatus === "live";

  const dot = offline ? "bg-breach" : ok ? "bg-safe" : "bg-warn";
  const text = offline ? "Offline" : isLoading && !data ? "Sync" : "Live";

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="relative flex size-1.5"
        title={chainLive ? "On-chain stream live" : "On-chain stream reconnecting"}
      >
        {chainLive ? (
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
