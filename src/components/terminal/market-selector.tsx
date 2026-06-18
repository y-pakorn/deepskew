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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={!activeOracles.length}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded border border-hairline bg-panel px-2 text-data whitespace-nowrap text-text-sec transition-colors hover:border-divider hover:text-foreground disabled:opacity-50"
          title="Select market / expiry"
        >
          {selectedOracle ? (
            <>
              BTC
              <span className="text-text-faint">·</span>
              <span className="tabular text-foreground">
                {fmtDuration(selectedOracle.expiry - now)}
              </span>
            </>
          ) : isLoading ? (
            "Loading…"
          ) : (
            "No market"
          )}
          <ChevronDown className="size-3 text-text-faint" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[60vh] w-44 overflow-auto"
      >
        <DropdownMenuLabel className="label-micro">
          BTC · Active expiries
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {activeOracles.map((o) => {
          const selected = o.oracle_id === selectedOracle?.oracle_id;
          return (
            <DropdownMenuItem
              key={o.oracle_id}
              onSelect={() => setSelectedOracleId(o.oracle_id)}
              className="cursor-pointer gap-3 text-data transition-colors focus:bg-accent-brand/15 focus:text-foreground data-[highlighted]:bg-accent-brand/15 data-[highlighted]:text-foreground"
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
