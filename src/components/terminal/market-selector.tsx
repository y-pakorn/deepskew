"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fmtDuration } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useMarket } from "./market-context";

/** Market/expiry picker, populated from the live active oracle set. */
export function MarketSelector() {
  const { activeOracles, selectedOracle, setSelectedOracleId, isLoading } =
    useMarket();
  const now = useNow();

  const label = selectedOracle
    ? `BTC · ${fmtDuration(selectedOracle.expiry - now)}`
    : isLoading
      ? "loading…"
      : "no market";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={!activeOracles.length}
          className="inline-flex items-center gap-1 rounded border border-hairline bg-panel px-2 py-1 text-val text-text-sec transition-colors hover:border-divider hover:text-foreground disabled:opacity-50"
          title="Select market / expiry"
        >
          {label}
          <ChevronDown className="size-3 text-text-faint" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[60vh] w-44 overflow-auto"
      >
        <DropdownMenuLabel className="label-micro">
          BTC · active expiries
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {activeOracles.map((o) => {
          const selected = o.oracle_id === selectedOracle?.oracle_id;
          return (
            <DropdownMenuItem
              key={o.oracle_id}
              onSelect={() => setSelectedOracleId(o.oracle_id)}
              className="gap-3 text-val"
            >
              <span className={cn(selected ? "text-accent-brand" : "")}>
                BTC
              </span>
              <span className="ml-auto tabular text-text-dim">
                {fmtDuration(o.expiry - now)}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
