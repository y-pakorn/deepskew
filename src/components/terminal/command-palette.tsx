"use client";

import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { fmtDuration } from "@/lib/format";
import { explorerObject, PREDICT_ID } from "@/lib/sui/constants";
import { useNow } from "@/lib/use-now";
import { useMarket } from "./market-context";

/** ⌘K palette — switch market/expiry, jump to explorer/docs. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { activeOracles, selectedOracleId, setSelectedOracleId } = useMarket();
  const now = useNow();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("deepskew:cmdk", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("deepskew:cmdk", onOpen);
    };
  }, []);

  const pick = (id: string) => {
    setSelectedOracleId(id);
    setOpen(false);
  };
  const go = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command"
      description="Switch market or jump to a resource"
    >
      <CommandInput placeholder="Search markets, actions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Markets · BTC expiries">
          {activeOracles.slice(0, 24).map((o) => (
            <CommandItem
              key={o.oracle_id}
              value={`BTC ${fmtDuration(o.expiry - now)} ${o.oracle_id}`}
              onSelect={() => pick(o.oracle_id)}
              className="gap-3"
            >
              <span
                className={
                  o.oracle_id === selectedOracleId ? "text-accent-brand" : ""
                }
              >
                BTC
              </span>
              <span className="ml-auto font-mono tabular text-text-dim">
                {fmtDuration(o.expiry - now)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {selectedOracleId ? (
            <CommandItem
              value="view selected oracle on explorer"
              onSelect={() => go(explorerObject(selectedOracleId))}
            >
              View selected oracle on explorer
            </CommandItem>
          ) : null}
          <CommandItem
            value="view predict market on explorer"
            onSelect={() => go(explorerObject(PREDICT_ID))}
          >
            View Predict market on explorer
          </CommandItem>
          <CommandItem
            value="deepbook predict docs"
            onSelect={() =>
              go("https://docs.sui.io/onchain-finance/deepbook-predict/")
            }
          >
            DeepBook Predict docs
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
