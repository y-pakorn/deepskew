"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GLOSSARY } from "@/lib/glossary";
import { cn } from "@/lib/utils";
import { TipContent } from "./tip-content";

export type PillTone = "neutral" | "up" | "down" | "accent" | "key" | "warn";

const tones: Record<PillTone, string> = {
  neutral: "bg-panel-elev text-text-sec",
  up: "bg-safe/12 text-safe",
  down: "bg-breach/12 text-breach",
  accent: "bg-accent-brand/12 text-accent-brand",
  key: "bg-accent-brand/12 text-accent-brand",
  warn: "bg-warn/12 text-warn",
};

/**
 * Compact capsule status tag (Fey-style). Color carries information. With `tip`
 * (a GLOSSARY key) the pill becomes a focusable info trigger — no underline, the
 * chip itself is the affordance.
 */
export function Pill({
  tone = "neutral",
  className,
  children,
  tip,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
  tip?: string;
}) {
  const pill = (
    <span
      tabIndex={tip ? 0 : undefined}
      className={cn(
        "group inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-data leading-none font-medium",
        tones[tone],
        tip &&
          "cursor-help outline-none focus-visible:ring-1 focus-visible:ring-accent-brand",
        className,
      )}
    >
      {tip ? (
        // border-bottom, not text-decoration: pill text is often a TextSwap
        // (inline-block), which underline can't cross.
        <span className="border-b border-dotted border-text-faint/70 pb-px transition-colors group-hover:border-text-dim group-focus-visible:border-accent-brand">
          {children}
        </span>
      ) : (
        children
      )}
    </span>
  );
  if (!tip) return pill;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent>
        <TipContent doc={GLOSSARY[tip] ?? tip} />
      </TooltipContent>
    </Tooltip>
  );
}
