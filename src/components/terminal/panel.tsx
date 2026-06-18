"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useComplexity } from "./complexity-context";

/**
 * A hairline-tiled desk panel: micro-label header + content body.
 * Place panels inside a `gap-px bg-hairline` grid so the 1px gaps read as
 * dividers (density from tiling, not boxes).
 *
 * `light` is the Light-mode lens: a plain-language verdict that stands in for the
 * dense Pro body. When the desk is in Light mode and a `light` node is supplied,
 * the panel shows that verdict and folds the full body behind a "Details"
 * expander — and the heavy Pro `children` mount lazily, only once expanded, so a
 * folded panel never pays to render its chart/surface. Pro mode, or any panel
 * without a `light` node, renders `children` verbatim, so Light is purely
 * additive and no panel regresses.
 */
export function Panel({
  title,
  code,
  right,
  light,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  code?: string;
  right?: React.ReactNode;
  light?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const { mode } = useComplexity();
  const [expanded, setExpanded] = useState(false);

  // Re-fold whenever the mode changes, so entering Light always starts at the
  // verdict (and the heavy Pro children un-mount) rather than stranding a panel
  // expanded across a Light→Pro→Light round-trip. Derived during render (the
  // pattern this codebase prefers over a set-state effect).
  const [modeAtRender, setModeAtRender] = useState(mode);
  if (mode !== modeAtRender) {
    setModeAtRender(mode);
    if (expanded) setExpanded(false);
  }

  const folds = mode === "light" && light != null;
  const summarizing = folds && !expanded;

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col bg-panel duration-500 animate-in fade-in-0",
        className,
      )}
    >
      <header className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-hairline px-3">
        <div className="flex items-baseline gap-2 truncate">
          <span className="panel-title">{title}</span>
          {code && !summarizing ? (
            <span className="label-micro text-text-faint">{code}</span>
          ) : null}
        </div>
        {folds ? (
          <div className="flex shrink-0 items-center gap-2">
            {expanded ? right : null}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-0.5 rounded-sm text-data font-medium text-text-dim outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-accent-brand"
            >
              {expanded ? "Less" : "Details"}
              <ChevronDown
                className={cn(
                  "size-3 transition-transform duration-200",
                  expanded && "rotate-180",
                )}
              />
            </button>
          </div>
        ) : right ? (
          <div className="flex shrink-0 items-center gap-2">{right}</div>
        ) : null}
      </header>
      {summarizing ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 duration-200 animate-in fade-in-0">
          {light}
        </div>
      ) : (
        <div
          className={cn(
            "min-h-0 flex-1 overflow-auto p-3",
            folds && "duration-200 animate-in fade-in-0",
            bodyClassName,
          )}
        >
          {children}
        </div>
      )}
    </section>
  );
}
