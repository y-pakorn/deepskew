"use client";

import dynamic from "next/dynamic";

// The terminal is the product's front door. It's client-only (wallet detection
// needs `window` + the Wallet Standard API); rich SSR metadata still ships from
// the root layout's <head> for scrapers/judges.
const TerminalShell = dynamic(
  () =>
    import("@/components/terminal/terminal-shell").then((m) => m.TerminalShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-canvas">
        <span className="label-micro animate-pulse">Booting desk…</span>
      </div>
    ),
  },
);

export default function Page() {
  return <TerminalShell />;
}
