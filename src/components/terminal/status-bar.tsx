"use client";

import { useIndexerStatus } from "@/lib/indexer/hooks";
import { SUI_NETWORK } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { LabelTip } from "./label-tip";

/** Thin footer status bar — indexer health, checkpoint, network, links. */
export function StatusBar() {
  const { data, isError } = useIndexerStatus();
  const ok = !isError && data?.status === "OK";

  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 overflow-hidden border-t border-hairline bg-canvas px-3 text-micro text-text-faint">
      <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
        <span
          className={cn(
            "size-1 rounded-full",
            isError ? "bg-breach" : ok ? "bg-safe" : "bg-warn",
          )}
        />
        <LabelTip k="indexer-status">
          Indexer {isError ? "Offline" : ok ? "OK" : "Sync"}
        </LabelTip>
      </span>
      {data ? (
        <LabelTip k="lag" className="shrink-0 whitespace-nowrap tabular">
          Lag {data.max_time_lag_seconds}s
        </LabelTip>
      ) : null}
      {data ? (
        <LabelTip k="checkpoint" className="shrink-0 whitespace-nowrap tabular">
          Ckpt {data.latest_onchain_checkpoint.toLocaleString()}
        </LabelTip>
      ) : null}
      <span className="hidden shrink-0 whitespace-nowrap sm:inline">
        Sui · {SUI_NETWORK}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-4">
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
        <span className="hidden 2xl:inline">Redeploys mainnet day one</span>
      </span>
    </footer>
  );
}
