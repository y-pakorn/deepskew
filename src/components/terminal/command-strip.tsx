"use client";

import Link from "next/link";
import { ConnectWallet } from "@/components/sui/connect-wallet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Clock } from "./clock";
import { useComplexity } from "./complexity-context";
import { LivePill } from "./live-pill";
import { DeepSkewMark } from "./logo";
import { MarketSelector } from "./market-selector";
import { NavMenu } from "./nav-menu";

const MODES = [
  { value: "light", label: "Noob" },
  { value: "pro", label: "Pro" },
] as const;

/** Display-mode switch. Noob folds every panel to a plain-language card (and
 *  turns Trade / Provide Liquidity into simple forms); Pro is the full
 *  instrument. A primary control, so it stays visible on every screen size. */
function ComplexityToggle() {
  const { mode, setMode } = useComplexity();
  return (
    <div
      role="group"
      aria-label="Display mode"
      className="flex h-7 items-center gap-0.5 rounded border border-hairline bg-panel p-0.5"
    >
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => setMode(m.value)}
          aria-pressed={mode === m.value}
          className={cn(
            "flex h-full items-center rounded-sm px-2 text-val font-medium leading-none outline-none transition-colors focus-visible:ring-1 focus-visible:ring-accent-brand",
            mode === m.value
              ? "bg-panel-elev text-foreground"
              : "text-text-dim hover:text-text-sec",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/** Top command strip — the authority signal of the desk. On mobile it carries
 *  just the mark, market, mode switch and a menu; the rest moves into the menu
 *  sheet. From md up it shows the full status / clock / wallet inline. */
export function CommandStrip() {
  return (
    <header className="flex h-11 shrink-0 items-center gap-2 overflow-hidden border-b border-hairline bg-canvas px-3 sm:gap-3">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2 text-md font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
      >
        <DeepSkewMark className="size-5 text-accent-brand" />
        <span className="hidden md:inline">deepskew</span>
      </Link>
      <span className="hidden text-text-faint md:inline">·</span>
      <MarketSelector />

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-3 md:flex">
          <LivePill />
          <Separator orientation="vertical" className="h-4 bg-hairline" />
          <Clock />
          <Separator orientation="vertical" className="h-4 bg-hairline" />
        </div>

        <ComplexityToggle />

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("deepskew:cmdk"))}
          className="hidden h-7 items-center rounded border border-hairline bg-panel px-2 text-val text-text-dim transition-colors hover:border-divider hover:text-foreground md:inline-flex"
          title="Command palette"
        >
          ⌘K
        </button>

        <div className="hidden md:block">
          <ConnectWallet />
        </div>

        <NavMenu />
      </div>
    </header>
  );
}
