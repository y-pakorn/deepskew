"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useActiveOracles } from "@/lib/indexer/hooks";
import { useLiveEvents } from "@/lib/indexer/use-live-events";
import type { OracleInfo } from "@/lib/indexer/types";
import type { StreamStatus } from "@/lib/sui/events";
import { useNow } from "@/lib/use-now";

interface MarketContextValue {
  activeOracles: OracleInfo[];
  isLoading: boolean;
  isError: boolean;
  selectedOracleId: string | null;
  setSelectedOracleId: (id: string) => void;
  selectedOracle: OracleInfo | undefined;
  /** On-chain checkpoint-stream connection state (the live push channel). */
  liveStatus: StreamStatus;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const { data: oracles = [], isLoading, isError } = useActiveOracles();
  const [picked, setPicked] = useState<string | null>(null);
  // Mount the live on-chain checkpoint stream once for the whole terminal; it
  // merges events into the shared query cache (no parallel store).
  const liveStatus = useLiveEvents();
  const now = useNow();
  // Coarse minute boundary: the live-vs-expired cut only needs to roll once a
  // minute (oracles turn over ~every 15 min), so the value stays referentially
  // stable between ticks and never re-renders the desk every second.
  const minute = Math.floor(now / 60_000);

  // The indexer's "active" set keeps oracles past their expiry that are still
  // awaiting on-chain settlement (status stays "active" until settled), and they
  // sort to the front by nearest expiry, so a naive activeOracles[0] default
  // lands on an already-expired oracle. Keep only the still-live expiries here;
  // fall back to the full set if none are live so the desk is never empty.
  const activeOracles = useMemo(() => {
    const nowMs = minute * 60_000;
    const live = oracles.filter((o) => o.expiry > nowMs);
    return live.length ? live : oracles;
  }, [oracles, minute]);

  // Derive the effective selection (no setState-in-effect): honor the user's
  // pick while it's still live, else fall back to the nearest-expiry oracle.
  const selectedOracleId = useMemo(() => {
    if (picked && activeOracles.some((o) => o.oracle_id === picked)) {
      return picked;
    }
    return activeOracles[0]?.oracle_id ?? null;
  }, [picked, activeOracles]);

  const selectedOracle = useMemo(
    () => activeOracles.find((o) => o.oracle_id === selectedOracleId),
    [activeOracles, selectedOracleId],
  );

  const value = useMemo<MarketContextValue>(
    () => ({
      activeOracles,
      isLoading,
      isError,
      selectedOracleId,
      setSelectedOracleId: setPicked,
      selectedOracle,
      liveStatus,
    }),
    [
      activeOracles,
      isLoading,
      isError,
      selectedOracleId,
      selectedOracle,
      liveStatus,
    ],
  );

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  );
}

export function useMarket(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error("useMarket must be used within <MarketProvider>");
  return ctx;
}
