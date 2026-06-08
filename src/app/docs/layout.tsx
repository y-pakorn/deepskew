import type { Metadata } from "next";
import Link from "next/link";
import { DeepSkewMark } from "@/components/terminal/logo";
import { DocsNav } from "@/components/docs/docs-nav";
import { OnThisPage } from "@/components/docs/on-this-page";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How deepskew works: the seven desk views, the volatility and risk math, the on-chain integration, how to provide liquidity, and how to verify every number against the chain.",
  alternates: { canonical: "/docs" },
};

/** Docs chrome — a scrollable reading layout (not the desk's fixed viewport):
 *  a sticky header, a sticky sidebar nav on desktop, a horizontal nav on mobile,
 *  and a centered reading column. Inherits the Tatem theme + fonts from the root
 *  layout, so it does not mount the desk shell or the wallet providers. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas [scrollbar-gutter:stable]">
      <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-canvas/85 px-4 backdrop-blur-sm lg:px-8">
        <Link href="/docs" className="flex items-center gap-2 outline-none">
          <DeepSkewMark className="size-5 text-accent-brand" />
          <span className="text-md font-semibold tracking-tight text-text">
            deepskew
          </span>
          <span className="label-micro text-text-faint">docs</span>
        </Link>
        <div className="flex items-center gap-4 text-data">
          <Link
            href="/"
            className="font-medium text-text-sec transition-colors hover:text-foreground"
          >
            Open the desk ↗
          </Link>
          <a
            href="https://docs.sui.io/onchain-finance/deepbook-predict/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-text-dim transition-colors hover:text-text-sec sm:inline"
          >
            DeepBook docs
          </a>
        </div>
      </header>

      {/* Mobile section nav */}
      <div className="sticky top-12 z-10 border-b border-hairline bg-canvas/85 px-4 py-2 backdrop-blur-sm lg:hidden">
        <DocsNav variant="top" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl gap-10 px-4 py-10 lg:px-8">
        {/* Left: section nav. top matches the rail's rest offset (header 3rem +
            py-10 2.5rem) so the sticky rails do not jump the instant you scroll. */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-[5.5rem]">
            <DocsNav variant="side" />
          </div>
        </aside>
        <main className="min-w-0 max-w-3xl flex-1">{children}</main>
        {/* Right: on-this-page content TOC (wide screens only). */}
        <aside className="hidden w-52 shrink-0 xl:block">
          <div className="sticky top-[5.5rem]">
            <OnThisPage />
          </div>
        </aside>
      </div>
    </div>
  );
}
