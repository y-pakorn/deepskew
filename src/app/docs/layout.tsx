import type { Metadata } from "next";
import { DocsCommandStrip } from "@/components/docs/docs-command-strip";
import { DocsNav } from "@/components/docs/docs-nav";
import { DocsStatusBar } from "@/components/docs/docs-status-bar";
import { OnThisPage } from "@/components/docs/on-this-page";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How deepskew works: the seven desk views, the volatility and risk math, the on-chain integration, how to provide liquidity, and how to verify every number against the chain.",
  alternates: { canonical: "/docs" },
};

/** Docs chrome — the desk frame applied to a scrolling reading layout: a sticky
 *  command strip and a live status-bar footer bookend the page (the manual is a
 *  surface of the same instrument), a sticky iconned nav rail on the left, a
 *  content TOC on the right, and the reading column tied to both by 1px hairline
 *  rails. It does not mount the desk shell or wallet providers; the live indexer
 *  heartbeat in the footer runs on the app-wide QueryClient from the root. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas [scrollbar-gutter:stable]">
      <DocsCommandStrip />

      {/* Mobile section nav */}
      <div className="sticky top-11 z-20 border-b border-hairline bg-canvas px-3 py-2 lg:hidden">
        <DocsNav variant="top" />
      </div>

      <div className="mx-auto flex w-full max-w-[88rem] flex-1 gap-8 px-4 lg:gap-10 lg:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-11 max-h-[calc(100dvh-2.75rem)] overflow-y-auto py-8 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <DocsNav variant="side" />
          </div>
        </aside>

        {/* The reading measure centers in its track until the TOC appears (xl),
            so it never strands a lopsided void when the right rail is hidden. */}
        <main className="min-w-0 flex-1 py-10">
          <div className="mx-auto max-w-3xl xl:mx-0">{children}</div>
        </main>

        <aside className="hidden w-52 shrink-0 py-10 xl:block">
          <div className="sticky top-[3.75rem]">
            <OnThisPage />
          </div>
        </aside>
      </div>

      <DocsStatusBar />
    </div>
  );
}
