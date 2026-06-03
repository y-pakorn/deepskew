"use client";

import { useCurrentClient } from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";

/**
 * Reverse-resolve a Sui address → its default SuiNS name (e.g. `alice.sui`)
 * through the gRPC Core API (`client.core.defaultNameServiceName`, which wraps
 * the `ReverseLookupName` RPC). Returns `null` when the address has no name.
 *
 * Names change rarely, so this caches hard; a failing/unsupported endpoint just
 * resolves to `null` (callers fall back to the raw address).
 */
export function useSuiName(address: string | null | undefined) {
  const client = useCurrentClient();

  return useQuery({
    queryKey: ["suins", "default-name", address],
    enabled: !!address,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data } = await client.core.defaultNameServiceName({
        address: address as string,
      });
      return data.name; // string | null
    },
  });
}
