"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIndexerStatus } from "@/lib/indexer/hooks";
import {
  explorerObject,
  INDEXER_BASE_URL,
  PREDICT_ID,
  PREDICT_PACKAGE_ID,
  SUI_NETWORK,
} from "@/lib/sui/constants";
import { cn } from "@/lib/utils";

/**
 * The manual's footer — the desk's StatusBar, rebuilt self-contained (the desk's
 * version is coupled to MarketContext, which the docs deliberately do not mount).
 * The indexer heartbeat is real: the checkpoint ticks while you read, so the
 * "every number is live" thesis is true even of the documentation chrome.
 */
export function DocsStatusBar() {
  const { data, isError } = useIndexerStatus();
  const ok = !isError && data?.status === "OK";
  const open = (url: string) => () => window.open(url, "_blank", "noopener");

  return (
    <footer className="sticky bottom-0 z-30 flex h-6 shrink-0 items-center gap-4 overflow-hidden border-t border-hairline bg-canvas px-3 text-micro text-text-faint">
      <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
        <span
          className={cn(
            "size-1 rounded-full",
            isError ? "bg-breach" : ok ? "bg-safe" : "bg-warn",
          )}
        />
        Indexer {isError ? "Offline" : ok ? "OK" : "Sync"}
      </span>
      {data ? (
        <span className="shrink-0 whitespace-nowrap tabular">
          Lag {data.max_time_lag_seconds}s
        </span>
      ) : null}
      {data ? (
        <span className="hidden shrink-0 whitespace-nowrap tabular sm:inline">
          Ckpt {data.latest_onchain_checkpoint.toLocaleString()}
        </span>
      ) : null}
      <span className="hidden shrink-0 whitespace-nowrap sm:inline">
        Sui · {SUI_NETWORK[0].toUpperCase() + SUI_NETWORK.slice(1)}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 whitespace-nowrap outline-none transition-colors hover:text-text-dim focus-visible:text-text-dim">
            Sources
            <ChevronDown className="size-2.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="label-micro text-text-faint">
              Verify on-chain · Suiscan
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <SourceItem
              label="Predict package"
              onClick={open(explorerObject(PREDICT_PACKAGE_ID))}
            />
            <SourceItem
              label="Predict market"
              onClick={open(explorerObject(PREDICT_ID))}
            />
            <DropdownMenuSeparator />
            <SourceItem label="Indexer API" onClick={open(INDEXER_BASE_URL)} />
          </DropdownMenuContent>
        </DropdownMenu>
        <Link href="/" className="transition-colors hover:text-text-dim">
          Desk
        </Link>
        <a
          href="https://x.com/DeepBookonSui"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-text-dim"
        >
          DeepBook
        </a>
      </span>
    </footer>
  );
}

function SourceItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className="flex cursor-pointer items-center justify-between gap-2 text-data text-text-sec focus:bg-accent-brand/15 focus:text-foreground data-[highlighted]:bg-accent-brand/15 data-[highlighted]:text-foreground"
    >
      {label}
      <ExternalLink className="size-3 text-text-faint" />
    </DropdownMenuItem>
  );
}
