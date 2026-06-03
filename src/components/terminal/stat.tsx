"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type Tone =
  | "default"
  | "safe"
  | "warn"
  | "breach"
  | "accent"
  | "key"
  | "dim";

export function toneClass(tone: Tone = "default"): string {
  return {
    default: "text-foreground",
    safe: "text-safe",
    warn: "text-warn",
    breach: "text-breach",
    accent: "text-accent-brand",
    key: "text-foreground", // key = brightest white, leads by weight + size, not hue
    dim: "text-text-dim",
  }[tone];
}

function dotClass(tone: Tone): string {
  return {
    default: "bg-text-dim",
    safe: "bg-safe",
    warn: "bg-warn",
    breach: "bg-breach",
    accent: "bg-accent-brand",
    key: "bg-accent-brand",
    dim: "bg-text-faint",
  }[tone];
}

const LEAD = /^([$€£₿◎])/; // currency symbols → de-emphasize
const TRAIL = /(%|bps|[KMBT]|e[-+]?\d+)$/i; // unit / scale / exponent → de-emphasize

/** Split a value into a magnitude + de-emphasizable affixes, or null if the
 *  core isn't a plain number (addresses, durations, mixed text). */
function parseValue(
  text: string,
): { lead: string; core: string; trail: string } | null {
  let s = text;
  let lead = "";
  let trail = "";
  const lm = s.match(LEAD);
  if (lm) {
    lead = lm[1];
    s = s.slice(lead.length);
  }
  const tm = s.match(TRAIL);
  if (tm && /[\d.]/.test(s[s.length - tm[1].length - 1] ?? "")) {
    trail = tm[1];
    s = s.slice(0, -trail.length);
  }
  if (!/^[+\-−]?[\d,]+(\.\d+)?$/.test(s)) return null;
  return { lead, core: s, trail };
}

/**
 * A numeric readout: Geist Mono tabular, with the leading currency symbol and
 * the trailing unit/scale/exponent rendered dim + smaller so the magnitude
 * leads. With `pop`, each character re-enters with a blurred slide whenever the
 * value changes (transitions-dev number pop-in) — for live, value-led numbers.
 */
export function MonoValue({
  children,
  className,
  pop = false,
}: {
  children: React.ReactNode;
  className?: string;
  pop?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const text = typeof children === "string" ? children : null;

  // Replay the per-digit pop-in on every value change (and on mount). Reflow
  // between remove + re-add is what restarts the CSS animation.
  useEffect(() => {
    if (!pop) return;
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-animating");
    void el.offsetHeight;
    el.classList.add("is-animating");
  }, [text, pop]);

  if (text == null) {
    return <span className={cn("tabular", className)}>{children}</span>;
  }
  const parts = parseValue(text);

  if (!pop) {
    if (!parts) return <span className={cn("tabular", className)}>{text}</span>;
    return (
      <span className={cn("tabular", className)}>
        {parts.lead ? <span className="affix">{parts.lead}</span> : null}
        {parts.core}
        {parts.trail ? <span className="affix">{parts.trail}</span> : null}
      </span>
    );
  }

  const lead = parts?.lead ?? "";
  const core = parts ? parts.core : text;
  const trail = parts?.trail ?? "";
  const chars = [...(lead + core + trail)];
  const n = chars.length;
  const leadLen = lead.length;
  const coreEnd = lead.length + core.length;
  return (
    <span ref={ref} className={cn("tabular t-digit-group", className)}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className={cn("t-digit", (i < leadLen || i >= coreEnd) && "affix")}
          data-stagger={i === n - 2 ? "1" : i === n - 1 ? "2" : undefined}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/**
 * Ledger row — label left, mono value right-aligned into a decimal column.
 * For dense parameter lists; keep cells narrow (2-up grid) so the gutter reads
 * as alignment, not void. `focal` tints the one value the panel is verdicting.
 */
export function Stat({
  label,
  value,
  tone = "default",
  focal = false,
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  focal?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="label-micro shrink-0">{label}</span>
      <MonoValue
        className={cn(
          "truncate text-right text-val leading-none",
          mono ? "font-medium" : "",
          focal ? "text-accent-brand" : toneClass(tone),
        )}
      >
        {value}
      </MonoValue>
    </div>
  );
}

/**
 * Stacked tile — tiny label on top, mono value directly below, left-aligned.
 * No horizontal pairing → structurally no center void. For headline clusters;
 * drop into a `<TileGrid>` so 1px hairline gaps divide the cells.
 */
export function StatTile({
  label,
  value,
  tone = "default",
  focal = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  focal?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-1 bg-panel px-3 py-2", className)}
    >
      <span className="label-micro truncate">{label}</span>
      <MonoValue
        pop
        className={cn(
          "truncate text-md font-medium leading-none tracking-tight",
          focal ? "text-accent-brand" : toneClass(tone),
        )}
      >
        {value}
      </MonoValue>
    </div>
  );
}

/** Hairline-divided grid for `StatTile` clusters (1px gaps read as dividers). */
export function TileGrid({
  cols = 2,
  className,
  children,
}: {
  cols?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-md border border-hairline bg-hairline",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

/** The panel's headline answer: status dot + tone statement (weight 500). */
export function Verdict({
  tone = "safe",
  children,
  sub,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-hairline bg-panel-elev/40 px-3 py-2",
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dotClass(tone))} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-val font-medium leading-tight",
            toneClass(tone),
          )}
        >
          {children}
        </div>
        {sub ? <div className="label-micro mt-0.5 truncate">{sub}</div> : null}
      </div>
    </div>
  );
}

/** A thin meter (value 0..1). */
export function Meter({
  value,
  tone = "accent",
}: {
  value: number;
  tone?: Tone;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const bar = {
    default: "bg-text-dim",
    safe: "bg-safe",
    warn: "bg-warn",
    breach: "bg-breach",
    accent: "bg-accent-brand",
    key: "bg-accent-brand",
    dim: "bg-text-faint",
  }[tone];
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-panel-elev">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", bar)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
