"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Desk" },
  { href: "/vol", label: "Vol Analytics" },
  { href: "/flow", label: "Flow & Edge" },
  { href: "/risk", label: "Vault" },
  { href: "/managers", label: "Managers" },
  { href: "/ops", label: "Ops / Health" },
  { href: "/cross-venue", label: "Cross-Venue" },
] as const;

/** The desk's primary nav — real routes (not in-memory tabs). The market
 *  selection, wallet and query cache live in the persistent DeskShell layout, so
 *  navigating between routes keeps live data warm. */
export function DeskNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Desk views"
      className="flex h-9 shrink-0 items-stretch gap-0.5 overflow-x-auto border-b border-hairline bg-canvas px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {NAV.map((t) => {
        const on = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex shrink-0 items-center px-2.5 text-val font-medium whitespace-nowrap outline-none transition-colors focus-visible:text-foreground",
              on ? "text-foreground" : "text-text-dim hover:text-text-sec",
            )}
          >
            {t.label}
            <span
              className={cn(
                "absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-accent-brand transition-opacity",
                on ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
