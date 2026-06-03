"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Swaps a status word in place when it changes: the old text exits up with blur,
 * the new enters from below (transitions-dev text-states-swap). The exit phase
 * is derived from `children !== shown` (render); only the timed swap + enter
 * release call setState, and they do so inside callbacks. For short strings.
 */
export function TextSwap({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const [shown, setShown] = useState(children);
  const [entering, setEntering] = useState(false);
  const exiting = children !== shown;

  useEffect(() => {
    if (!exiting) return;
    const dur =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--text-swap-dur",
        ),
      ) || 170;
    const t = setTimeout(() => {
      setShown(children); // swap text…
      setEntering(true); // …jumped below, no transition
      // two frames so the "below" state paints before we release it,
      // letting the enter transition back to rest.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setEntering(false)),
      );
    }, dur);
    return () => clearTimeout(t);
  }, [exiting, children]);

  return (
    <span
      className={cn(
        "t-text-swap",
        exiting && "is-exit",
        entering && "is-enter-start",
        className,
      )}
    >
      {shown}
    </span>
  );
}
