"use client";

import Link from "next/link";
import { ConnectWallet } from "@/components/sui/connect-wallet";
import { Separator } from "@/components/ui/separator";
import { Clock } from "./clock";
import { LivePill } from "./live-pill";

/** Top command strip — the authority signal of the desk. */
export function CommandStrip() {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-hairline bg-canvas px-3">
      <Link
        href="/"
        className="font-mono text-[13px] font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
      >
        DEEPSKEW
      </Link>
      <span className="text-text-faint">·</span>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded border border-hairline bg-panel px-2 py-1 font-mono text-[12px] text-text-sec transition-colors hover:border-divider hover:text-foreground"
        title="Market — more markets coming"
      >
        BTC-1H
        <span className="text-text-faint">▾</span>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <LivePill />
        <Separator orientation="vertical" className="h-4 bg-hairline" />
        <Clock />
        <Separator
          orientation="vertical"
          className="hidden h-4 bg-hairline sm:block"
        />
        <kbd className="hidden rounded border border-hairline bg-panel px-1.5 py-0.5 font-mono text-[11px] text-text-dim sm:inline">
          ⌘K
        </kbd>
        <ConnectWallet />
      </div>
    </header>
  );
}
