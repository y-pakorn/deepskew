"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Indexer is seconds-fresh; keep data warm but not stale-forever.
        staleTime: 5_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

// TanStack's App Router pattern: a fresh client on the server, a browser
// singleton so re-renders / HMR don't drop the cache.
let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

/**
 * App-wide providers. Intentionally SSR-safe (no wallet/dApp Kit here) so the
 * marketing surface still renders for scrapers/judges. The wallet-dependent
 * terminal mounts its own client-only DAppKitClientProvider (ssr:false).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={120}>{children}</TooltipProvider>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
