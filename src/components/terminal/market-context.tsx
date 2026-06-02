"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useActiveOracles } from "@/lib/indexer/hooks";
import type { OracleInfo } from "@/lib/indexer/types";

interface MarketContextValue {
  activeOracles: OracleInfo[];
  isLoading: boolean;
  isError: boolean;
  selectedOracleId: string | null;
  setSelectedOracleId: (id: string) => void;
  selectedOracle: OracleInfo | undefined;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const { data: activeOracles = [], isLoading, isError } = useActiveOracles();
  const [picked, setPicked] = useState<string | null>(null);

  // Derive the effective selection (no setState-in-effect): honor the user's
  // pick while it's still active, else fall back to the nearest-expiry oracle.
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
    }),
    [activeOracles, isLoading, isError, selectedOracleId, selectedOracle],
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
