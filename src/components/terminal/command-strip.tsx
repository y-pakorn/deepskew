"use client";

import Link from "next/link";
import { ConnectWallet } from "@/components/sui/connect-wallet";
import { Separator } from "@/components/ui/separator";
import { Clock } from "./clock";
import { LivePill } from "./live-pill";
import { DeepSkewMark } from "./logo";
import { MarketSelector } from "./market-selector";

/** Top command strip — the authority signal of the desk. */
export function CommandStrip() {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 overflow-hidden border-b border-hairline bg-canvas px-3">
      <Link
        href="/"
        className="flex items-center gap-2 text-md font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
      >
        <DeepSkewMark className="size-5 text-accent-brand" />
        deepskew
      </Link>
      <span className="text-text-faint">·</span>
      <MarketSelector />

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <LivePill />
        <Separator orientation="vertical" className="h-4 bg-hairline" />
        <Clock />
        <Separator
          orientation="vertical"
          className="hidden h-4 bg-hairline sm:block"
        />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("deepskew:cmdk"))}
          className="hidden rounded border border-hairline bg-panel px-1.5 py-0.5 text-val text-text-dim transition-colors hover:border-divider hover:text-foreground sm:inline"
          title="Command palette"
        >
          ⌘K
        </button>
        <ConnectWallet />
      </div>
    </header>
  );
}
