"use client";

import { ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "@/components/sui/connect-wallet";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SUI_NETWORK } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { Clock } from "./clock";
import { NAV } from "./desk-nav";
import { LivePill } from "./live-pill";
import { DeepSkewMark } from "./logo";

const NETWORK_LABEL = SUI_NETWORK[0].toUpperCase() + SUI_NETWORK.slice(1);

/** Mobile nav: a hamburger that opens a right-side sheet carrying the desk
 *  status, the wallet, and the full page list in large type. Hidden at md+,
 *  where the command strip + DeskNav carry these directly. */
export function NavMenu() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="flex size-7 items-center justify-center rounded border border-hairline bg-panel text-text-sec transition-colors hover:border-divider hover:text-foreground md:hidden"
        >
          <Menu className="size-4" />
        </button>
      </SheetTrigger>

      <SheetContent className="w-[86vw] max-w-sm">
        <SheetHeader className="flex flex-row items-center gap-2.5 border-b border-hairline px-5 py-4">
          <DeepSkewMark className="size-6 shrink-0 text-accent-brand" />
          <SheetTitle className="leading-none tracking-tight">
            deepskew
          </SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
          {/* Wallet — the primary action, stretched to a real mobile CTA */}
          <div className="[&_button]:h-10 [&_button]:w-full [&_button]:justify-center [&_button]:rounded-lg [&_button]:text-val">
            <ConnectWallet />
          </div>

          {/* Status card */}
          <div className="overflow-hidden rounded-lg border border-hairline bg-panel">
            <Row label="Connection">
              <LivePill />
            </Row>
            <Row label="Clock" divider>
              <Clock />
            </Row>
            <Row label="Network" divider>
              <span className="tabular text-val text-text-sec">
                {NETWORK_LABEL}
              </span>
            </Row>
          </div>

          {/* Views */}
          <div>
            <span className="label-micro px-1 text-text-faint">Views</span>
            <nav className="mt-2 flex flex-col gap-1" aria-label="Desk views">
              {NAV.map((t) => {
                const on = isActive(t.href);
                const Icon = t.icon;
                return (
                  <SheetClose asChild key={t.href}>
                    <Link
                      href={t.href}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                        on
                          ? "border-hairline bg-panel-elev text-foreground"
                          : "border-transparent text-text-dim hover:bg-panel-elev/50 hover:text-text-sec",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-5 shrink-0 transition-colors",
                          on
                            ? "text-accent-brand"
                            : "text-text-faint group-hover:text-text-dim",
                        )}
                      />
                      <span className="flex-1 text-lead font-medium tracking-tight">
                        {t.label}
                      </span>
                      <ChevronRight
                        className={cn(
                          "size-4 transition-colors",
                          on
                            ? "text-text-dim"
                            : "text-transparent group-hover:text-text-faint",
                        )}
                      />
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label,
  divider = false,
  children,
}: {
  label: string;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-11 items-center justify-between px-3.5",
        divider && "border-t border-hairline",
      )}
    >
      <span className="label-micro">{label}</span>
      {children}
    </div>
  );
}
