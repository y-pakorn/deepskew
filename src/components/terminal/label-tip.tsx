"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GLOSSARY } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * A label that explains itself: a dotted underline + help cursor signals it's
 * hoverable, and the tooltip carries the definition. `k` is a GLOSSARY key (we
 * fall back to the literal string if it isn't one), so the label text and its
 * definition live in one place. Focusable so the copy is reachable by keyboard,
 * not just the mouse.
 */
export function LabelTip({
  k,
  children,
  className,
  side = "top",
}: {
  k: string;
  children: ReactNode;
  className?: string;
  side?: ComponentProps<typeof TooltipContent>["side"];
}) {
  const text = GLOSSARY[k] ?? k;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "cursor-help underline decoration-dotted decoration-text-faint/70 underline-offset-2 outline-none transition-colors hover:decoration-text-dim focus-visible:decoration-accent-brand",
            className,
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side}>{text}</TooltipContent>
    </Tooltip>
  );
}
