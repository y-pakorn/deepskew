"use client";

import { useIndexerStatus } from "@/lib/indexer/hooks";
import { SUI_NETWORK } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";

/** Thin footer status bar — indexer health, checkpoint, network, links. */
export function StatusBar() {
  const { data, isError } = useIndexerStatus();
  const ok = !isError && data?.status === "OK";

  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-hairline bg-canvas px-3 text-micro text-text-faint">
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "size-1 rounded-full",
            isError ? "bg-breach" : ok ? "bg-safe" : "bg-warn",
          )}
        />
        Indexer {isError ? "Offline" : ok ? "OK" : "Sync"}
      </span>
      {data ? <span className="tabular">Lag {data.max_time_lag_seconds}s</span> : null}
      {data ? (
        <span className="tabular">
          Ckpt {data.latest_onchain_checkpoint.toLocaleString()}
        </span>
      ) : null}
      <span>Sui · {SUI_NETWORK}</span>
      <span className="ml-auto flex items-center gap-4">
        <a
          href="https://docs.sui.io/onchain-finance/deepbook-predict/"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-text-dim"
        >
          Docs
        </a>
        <a
          href="https://x.com/DeepBookonSui"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-text-dim"
        >
          DeepBook
        </a>
        <span>Redeploys mainnet day one</span>
      </span>
    </footer>
  );
}
