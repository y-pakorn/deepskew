"use client";

import { cn } from "@/lib/utils";
import { LabelTip } from "./label-tip";

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
 * leads. With `pop`, characters re-enter with a blurred slide (transitions-dev
 * number pop-in) — but only the ones that actually changed since the previous
 * value, diffed right-aligned so units stay put. A steadily-ticking countdown
 * pops just its moving digit; a price tick pops just the digits that moved.
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
  const text = typeof children === "string" ? children : null;

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

  // Per-digit pop-in, keyed by right-aligned position + glyph. A character that
  // didn't change keeps its key → React reuses the node → its animation stays
  // finished (no replay). A character that changed gets a new key → React
  // remounts it → its CSS animation restarts. So only the moving digits pop;
  // the rest hold still, even as the panel re-renders every second.
  const lead = parts?.lead ?? "";
  const core = parts ? parts.core : text;
  const trail = parts?.trail ?? "";
  const chars = [...(lead + core + trail)];
  const n = chars.length;
  const leadLen = lead.length;
  const coreEnd = lead.length + core.length;
  return (
    <span className={cn("tabular t-digit-group is-animating", className)}>
      {chars.map((ch, i) => {
        const fromRight = n - 1 - i;
        return (
          <span
            key={`${fromRight}:${ch}`}
            className={cn("t-digit", (i < leadLen || i >= coreEnd) && "affix")}
            data-stagger={i === n - 2 ? "1" : i === n - 1 ? "2" : undefined}
          >
            {ch}
          </span>
        );
      })}
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
  tip,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  focal?: boolean;
  mono?: boolean;
  tip?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      {tip ? (
        <LabelTip k={tip} className="label-micro shrink-0">
          {label}
        </LabelTip>
      ) : (
        <span className="label-micro shrink-0">{label}</span>
      )}
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
  tip,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  focal?: boolean;
  className?: string;
  tip?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 bg-panel px-3 py-1.5 2xl:py-2",
        className,
      )}
    >
      {tip ? (
        <LabelTip k={tip} className="label-micro truncate">
          {label}
        </LabelTip>
      ) : (
        <span className="label-micro truncate">{label}</span>
      )}
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
        // shrink-0: a tile cluster must never collapse below its content when it
        // lives inside a scrollable flex column (overflow-hidden otherwise lets
        // flexbox squeeze it to zero height).
        "grid shrink-0 gap-px overflow-hidden rounded-md border border-hairline bg-hairline",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

/**
 * A panel's headline metric — the "instrument" lead: a small label, one big mono
 * number (tone-colored, affixes de-emphasized), and a one-line context. Put it
 * at the top of a panel above the chart/table. Keep `value` short (a number +
 * unit); push the qualitative phrase into `sub`.
 */
export function Hero({
  label,
  value,
  sub,
  tone = "default",
  tip,
  accessory,
  divider = true,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  tip?: string;
  accessory?: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0",
        divider && "border-b border-hairline pb-2.5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {tip ? (
          <LabelTip k={tip} className="label-micro">
            {label}
          </LabelTip>
        ) : (
          <span className="label-micro">{label}</span>
        )}
        {accessory ? <div className="shrink-0">{accessory}</div> : null}
      </div>
      <MonoValue
        className={cn(
          "mt-1 block truncate text-[1.75rem] leading-none font-medium tracking-tight",
          toneClass(tone),
        )}
      >
        {value}
      </MonoValue>
      {sub ? (
        <div className="label-micro mt-1.5 truncate text-text-dim">{sub}</div>
      ) : null}
    </div>
  );
}

/** The panel's headline answer: status dot + tone statement (weight 500). */
export function Verdict({
  tone = "safe",
  children,
  sub,
  className,
  wrap = false,
  tip,
}: {
  tone?: Tone;
  children: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
  wrap?: boolean;
  tip?: string;
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
            "text-val font-medium leading-tight",
            wrap ? "whitespace-normal" : "truncate",
            toneClass(tone),
          )}
        >
          {tip ? (
            <LabelTip k={tip} className="decoration-text-faint/50">
              {children}
            </LabelTip>
          ) : (
            children
          )}
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
