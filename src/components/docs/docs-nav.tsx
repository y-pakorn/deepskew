"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const DOCS_NAV = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/views", label: "The Desk Views" },
  { href: "/docs/math", label: "Methodology" },
  { href: "/docs/integration", label: "On-Chain Integration" },
  { href: "/docs/liquidity", label: "Provide Liquidity" },
  { href: "/docs/verify", label: "Verify It's Real" },
  { href: "/docs/glossary", label: "Glossary" },
] as const;

/** Docs section nav. `side` is the sticky desktop sidebar; `top` is the
 *  horizontal scroller shown under the header on mobile. */
export function DocsNav({
  variant = "side",
  className,
}: {
  variant?: "side" | "top";
  className?: string;
}) {
  const pathname = usePathname();
  const isOn = (href: string) =>
    href === "/docs" ? pathname === "/docs" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Documentation"
      className={cn(
        variant === "side"
          ? "flex flex-col gap-0.5"
          : "flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {DOCS_NAV.map((it) => {
        const on = isOn(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-val whitespace-nowrap outline-none transition-colors focus-visible:text-foreground",
              on
                ? "bg-accent-brand/10 font-medium text-foreground"
                : "text-text-dim hover:bg-panel-elev hover:text-text-sec",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
