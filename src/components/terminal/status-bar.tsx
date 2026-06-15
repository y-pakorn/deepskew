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
import { LabelTip } from "./label-tip";
import { useMarket } from "./market-context";

/** Thin footer status bar — indexer health, checkpoint, network, on-chain
 *  sources, links. The Sources menu makes the read-only thesis verifiable:
 *  it points a judge straight at the exact package + objects the desk reads. */
export function StatusBar() {
  const { data, isError } = useIndexerStatus();
  const { selectedOracleId } = useMarket();
  const ok = !isError && data?.status === "OK";

  const open = (url: string) => () => window.open(url, "_blank", "noopener");

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
            <SourceItem label="Predict package" onClick={open(explorerObject(PREDICT_PACKAGE_ID))} />
            <SourceItem label="Predict market" onClick={open(explorerObject(PREDICT_ID))} />
            {selectedOracleId ? (
              <SourceItem
                label="Active oracle"
                onClick={open(explorerObject(selectedOracleId))}
              />
            ) : null}
            <DropdownMenuSeparator />
            <SourceItem label="Indexer API" onClick={open(INDEXER_BASE_URL)} />
          </DropdownMenuContent>
        </DropdownMenu>
        <Link href="/docs" className="transition-colors hover:text-text-dim">
          Docs
        </Link>
        <a
          href="https://x.com/DeepBookonSui"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-text-dim"
        >
          DeepBook
        </a>
        <span className="hidden 2xl:inline">Mainnet when Predict ships</span>
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
