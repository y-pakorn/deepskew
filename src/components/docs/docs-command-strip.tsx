"use client";

import { ArrowUpRight, BookText, ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DeepSkewMark } from "@/components/terminal/logo";
import { Separator } from "@/components/ui/separator";
import { activeDocLabel } from "./docs-nav";

/**
 * The manual's command strip — a faithful sibling of the desk's CommandStrip
 * (same h-11, solid bg-canvas, no blur) so the docs read as the same instrument.
 * The market selector slot is repurposed as a non-interactive context chip
 * naming the section you are in; the Connect-wallet slot becomes the one cerulean
 * CTA back to the live desk.
 */
export function DocsCommandStrip() {
  const pathname = usePathname();
  const label = activeDocLabel(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-11 shrink-0 items-center gap-2 border-b border-hairline bg-canvas px-3 sm:gap-3 sm:px-4">
      <Link
        href="/docs"
        className="flex shrink-0 items-center gap-2 rounded text-md font-semibold tracking-tight text-foreground outline-none transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:ring-accent-brand"
      >
        <DeepSkewMark className="size-5 text-accent-brand" />
        <span>deepskew</span>
      </Link>
      <span className="hidden text-text-faint md:inline" aria-hidden="true">
        ·
      </span>
      <span className="hidden h-7 items-center gap-1.5 rounded border border-hairline bg-panel px-2 md:inline-flex">
        <BookText className="size-3.5 text-text-faint" aria-hidden="true" />
        <span className="text-val font-medium text-text-sec">{label}</span>
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-1.5 md:flex">
          <span className="size-1.5 rounded-full bg-safe" aria-hidden="true" />
          <span className="label-micro text-text-sec">Manual</span>
          <span className="text-data tabular text-text-faint">· v1</span>
        </span>
        <Separator orientation="vertical" className="hidden h-4 bg-hairline md:block" />
        <a
          href="https://docs.sui.io/onchain-finance/deepbook-predict/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1 rounded text-data text-text-dim outline-none transition-colors hover:text-text-sec focus-visible:text-text-sec sm:inline-flex"
        >
          DeepBook docs
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
        <Separator orientation="vertical" className="hidden h-4 bg-hairline sm:block" />
        <Link
          href="/"
          className="inline-flex h-7 items-center gap-1.5 rounded bg-accent-brand px-2.5 text-val font-medium text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-1 focus-visible:ring-accent-brand"
        >
          Open the desk
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
