"use client";

import {
  BookA,
  Boxes,
  CandlestickChart,
  Compass,
  ExternalLink,
  Landmark,
  LayoutGrid,
  ShieldCheck,
  Sigma,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { INDEXER_BASE_URL } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";

interface DocNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
interface DocNavGroup {
  label: string;
  items: DocNavItem[];
}

/** Grouped, iconned doc nav. Icons echo the desk's monochrome line set; the
 *  active idiom (cerulean icon + foreground label + a cerulean bar) is the
 *  vertical cousin of the desk-nav active underline. */
export const DOCS_NAV_GROUPS: DocNavGroup[] = [
  {
    label: "Start",
    items: [
      { href: "/docs", label: "Overview", icon: Compass },
      { href: "/docs/views", label: "The Desk Views", icon: LayoutGrid },
    ],
  },
  {
    label: "How it works",
    items: [
      { href: "/docs/math", label: "Methodology", icon: Sigma },
      { href: "/docs/integration", label: "On-Chain Integration", icon: Boxes },
    ],
  },
  {
    label: "Act on-chain",
    items: [
      { href: "/docs/trade", label: "Trade Binaries", icon: CandlestickChart },
      { href: "/docs/liquidity", label: "Provide Liquidity", icon: Landmark },
    ],
  },
  {
    label: "Reference",
    items: [
      { href: "/docs/verify", label: "Verify It's Real", icon: ShieldCheck },
      { href: "/docs/glossary", label: "Glossary", icon: BookA },
    ],
  },
];

const DOCS_NAV = DOCS_NAV_GROUPS.flatMap((g) => g.items);

const isOn = (pathname: string, href: string) =>
  href === "/docs" ? pathname === "/docs" : pathname.startsWith(href);

/** The active doc's label, for the command-strip context chip (longest match). */
export function activeDocLabel(pathname: string): string {
  const hit = [...DOCS_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((it) => isOn(pathname, it.href));
  return hit?.label ?? "Manual";
}

export function DocsNav({
  variant = "side",
  className,
}: {
  variant?: "side" | "top";
  className?: string;
}) {
  const pathname = usePathname();

  if (variant === "top") {
    return (
      <nav
        aria-label="Documentation"
        className={cn(
          "flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {DOCS_NAV.map((it) => {
          const on = isOn(pathname, it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "group relative flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-val whitespace-nowrap outline-none transition-colors focus-visible:ring-1 focus-visible:ring-accent-brand",
                on ? "text-foreground" : "text-text-dim hover:text-text-sec",
              )}
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0 transition-colors",
                  on
                    ? "text-accent-brand"
                    : "text-text-faint group-hover:text-text-dim",
                )}
              />
              {it.label}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-accent-brand transition-opacity",
                  on ? "opacity-100" : "opacity-0",
                )}
              />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Documentation" className={cn("flex flex-col", className)}>
      {DOCS_NAV_GROUPS.map((group, gi) => (
        <div
          key={group.label}
          className={cn("flex flex-col gap-0.5", gi > 0 && "mt-4")}
        >
          <div className="label-micro px-3 pb-1.5 text-text-faint">
            {group.label}
          </div>
          {group.items.map((it) => {
            const on = isOn(pathname, it.href);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2 rounded-md py-1.5 pr-2 pl-3 text-val whitespace-nowrap outline-none transition-colors focus-visible:ring-1 focus-visible:ring-accent-brand",
                  on
                    ? "text-foreground"
                    : "text-text-dim hover:bg-panel-elev hover:text-text-sec",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent-brand transition-opacity",
                    on ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon
                  className={cn(
                    "size-3.5 shrink-0 transition-colors",
                    on
                      ? "text-accent-brand"
                      : "text-text-faint group-hover:text-text-dim",
                  )}
                />
                <span className={cn(on && "font-medium")}>{it.label}</span>
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-5 flex flex-col gap-2 border-t border-hairline pt-4 pl-3">
        <a
          href="https://docs.sui.io/onchain-finance/deepbook-predict/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-micro text-text-faint transition-colors hover:text-text-dim"
        >
          DeepBook docs
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
        <a
          href={INDEXER_BASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-micro text-text-faint transition-colors hover:text-text-dim"
        >
          Indexer API
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </nav>
  );
}
