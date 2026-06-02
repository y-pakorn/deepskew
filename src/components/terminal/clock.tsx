"use client";

import { utcClock } from "@/lib/format";
import { useNow } from "@/lib/use-now";

/** UTC HH:MM:SS clock. Client-only so SSR/CSR never disagree. */
export function Clock() {
  const now = useNow();
  return (
    <span
      className="text-val tabular text-text-dim"
      suppressHydrationWarning
    >
      {now ? utcClock(new Date(now)) : "--:--:--"}{" "}
      <span className="text-text-faint">UTC</span>
    </span>
  );
}
