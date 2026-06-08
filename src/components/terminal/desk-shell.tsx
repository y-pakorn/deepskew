"use client";

import { useSyncExternalStore } from "react";
import { DAppKitClientProvider } from "@/components/sui/dapp-kit-provider";
import { CommandPalette } from "./command-palette";
import { CommandStrip } from "./command-strip";
import { DeskNav } from "./desk-nav";
import { MarketProvider } from "./market-context";
import { StatusBar } from "./status-bar";

/**
 * The persistent desk frame, mounted once by the (desk) route-group layout so
 * the dApp Kit instance, wallet detection, market selection and React Query
 * cache survive route navigation. Client-only (wallet detection needs `window`
 * + the Wallet Standard API) via a mount gate, which also keeps SSR safe.
 */
const emptySubscribe = () => () => {};

export function DeskShell({ children }: { children: React.ReactNode }) {
  // Hydration gate: false on the server + first client render, true after — keeps
  // the wallet/dApp Kit boundary client-only without a set-state-in-effect.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    // Branded boot skeleton that mirrors the desk silhouette (command strip,
    // nav, body, status bar) so the hydration flash reads as the terminal
    // loading, not a blank/broken screen, even if the data path is slow.
    return (
      <div className="flex h-dvh flex-col bg-canvas">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-4">
          <span className="size-2 animate-pulse rounded-full bg-accent-brand" />
          <span className="text-md font-semibold tracking-tight text-text-sec">
            deepskew
          </span>
        </div>
        <div className="h-9 shrink-0 border-b border-hairline" />
        <div className="flex flex-1 items-center justify-center">
          <span className="label-micro animate-pulse text-text-faint">
            Booting terminal…
          </span>
        </div>
        <div className="h-6 shrink-0 border-t border-hairline" />
      </div>
    );
  }

  return (
    <DAppKitClientProvider>
      <MarketProvider>
        <div className="flex min-h-dvh flex-col bg-canvas lg:h-dvh lg:overflow-hidden">
          <CommandStrip />
          <DeskNav />
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          <StatusBar />
        </div>
        <CommandPalette />
      </MarketProvider>
    </DAppKitClientProvider>
  );
}
