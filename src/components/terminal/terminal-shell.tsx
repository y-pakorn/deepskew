"use client";

import { DAppKitClientProvider } from "@/components/sui/dapp-kit-provider";
import { CommandPalette } from "./command-palette";
import { CommandStrip } from "./command-strip";
import { DeskPanel } from "./desk-panel";
import { MarketProvider } from "./market-context";
import { OraclePanel } from "./oracle-panel";
import { SmilePanel } from "./smile-panel";
import { StatusBar } from "./status-bar";
import { SurfacePanel } from "./surface-panel";
import { Ticker } from "./ticker";
import { VaultPanel } from "./vault-panel";

/**
 * The full desk. Mounted client-only (ssr:false) by the root page so the dApp
 * Kit instance + wallet detection never touch the server.
 */
export function TerminalShell() {
  return (
    <DAppKitClientProvider>
      <MarketProvider>
        <div className="flex min-h-dvh flex-col bg-canvas lg:h-dvh lg:overflow-hidden">
          <CommandStrip />
          <Ticker />
          <div className="grid flex-1 grid-cols-1 gap-px bg-hairline lg:min-h-0 lg:grid-cols-[1.6fr_1fr_1fr] lg:grid-rows-[1.5fr_1fr]">
            <SurfacePanel className="min-h-[260px] lg:min-h-0" />
            <SmilePanel />
            <OraclePanel />
            <VaultPanel className="min-h-[220px] lg:col-span-2 lg:min-h-0" />
            <DeskPanel />
          </div>
          <StatusBar />
        </div>
        <CommandPalette />
      </MarketProvider>
    </DAppKitClientProvider>
  );
}
