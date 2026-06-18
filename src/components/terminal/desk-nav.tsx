"use client";

import {
  Activity,
  ArrowLeftRight,
  Gauge,
  Landmark,
  Scale,
  Server,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Desk", icon: Gauge },
  { href: "/vol", label: "Vol Analytics", icon: Activity },
  { href: "/flow", label: "Flow & Edge", icon: ArrowLeftRight },
  { href: "/risk", label: "Vault", icon: Landmark },
  { href: "/managers", label: "Managers", icon: Trophy },
  { href: "/ops", label: "Ops / Health", icon: Server },
  { href: "/cross-venue", label: "Cross-Venue", icon: Scale },
] as const;

/** The desk's primary nav — real routes (not in-memory tabs). The market
 *  selection, wallet and query cache live in the persistent DeskShell layout, so
 *  navigating between routes keeps live data warm. Hidden on mobile (the page
 *  list moves into the menu sheet). */
export function DeskNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Desk views"
      className="hidden h-9 shrink-0 items-stretch gap-0.5 overflow-x-auto border-b border-hairline bg-canvas px-2 [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden"
    >
      {NAV.map((t) => {
        const on = isActive(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-1.5 px-2.5 text-val font-medium whitespace-nowrap outline-none transition-colors focus-visible:text-foreground",
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
