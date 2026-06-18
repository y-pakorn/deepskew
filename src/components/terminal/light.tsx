"use client";

import { cn } from "@/lib/utils";
import { LabelTip } from "./label-tip";
import { MonoValue, toneClass, type Tone } from "./stat";

/**
 * Light-mode card kit. Light folds a dense panel to one plain-language answer;
 * these primitives are the shared vocabulary so the whole desk reads as one
 * designed lens, not thirty bespoke layouts — yet they compose per panel, so
 * each card can fit the clearest information for that specific panel:
 *
 *   <LightCard>
 *     <LightLede>…verdict sentence with <Num> figures…</LightLede>
 *     // optional, pick what fits this panel:
 *     <LightFigures items={[…]} />        — 2–3 supporting numbers
 *     <Meter /> / <Sparkline /> / split    — a small reused visual
 *     <LightNote>what this means</LightNote>
 *   </LightCard>
 *
 * Categorical "grade/health" panels can lead with the existing <Verdict> (dot +
 * statement) instead of <LightLede>. Reuse, never duplicate.
 */

/** An inline figure for lede prose: mono tabular, magnitude bright, affixes
 *  dimmed (via MonoValue). White by default so numbers lead; pass a `tone` only
 *  when the figure is itself a verdict (an edge that is good/bad). */
export function Num({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <MonoValue
      className={cn(
        "font-medium tracking-tight",
        tone ? toneClass(tone) : "text-foreground",
        className,
      )}
    >
      {children}
    </MonoValue>
  );
}

/** Vertical card rhythm. `fill` makes the card own the full panel height so a
 *  chart region (`<div className="flex min-h-0 flex-1 flex-col">…`) grows into
 *  the slack; without it the card stacks at its natural height and the panel
 *  body scrolls when content is tall. */
export function LightCard({
  children,
  fill = false,
  className,
}: {
  children: React.ReactNode;
  fill?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col",
        fill ? "h-full gap-3" : "gap-3.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A small section label above an in-card chart/visual. Plain by default; pass a
 *  GLOSSARY `tip` to keep the canonical term one hover away. */
export function LightSubLabel({
  children,
  tip,
  className,
}: {
  children: React.ReactNode;
  tip?: string;
  className?: string;
}) {
  if (tip) {
    return (
      <LabelTip k={tip} className={cn("label-micro", className)}>
        {children}
      </LabelTip>
    );
  }
  return <span className={cn("label-micro", className)}>{children}</span>;
}

/** The verdict sentence — the panel's whole answer in plain language. Wrap the
 *  key numbers in <Num> so they lead by brightness. The prose itself stays a
 *  step down (text-sec) so the figures read as the signal. `lead` bumps a short
 *  verdict up one size. */
export function LightLede({
  children,
  lead = false,
  className,
}: {
  children: React.ReactNode;
  lead?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-balance font-medium text-text-sec",
        lead ? "text-lead leading-tight tracking-tight" : "text-md leading-snug",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface Figure {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  /** GLOSSARY key — keeps the canonical term one hover away on a plain label. */
  tip?: string;
}

/** A tight row of supporting numbers, value-led (plain label over a mono value),
 *  divided from the verdict by a hairline. Keep to 2–3 so the row never crowds;
 *  choose the figures that make the verdict legible, not every number Pro shows. */
export function LightFigures({
  items,
  className,
}: {
  items: Figure[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-3 border-t border-hairline pt-3",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}
    >
      {items.map((it) => (
        <div key={it.label} className="flex min-w-0 flex-col gap-1">
          {it.tip ? (
            <LabelTip k={it.tip} className="label-micro truncate">
              {it.label}
            </LabelTip>
          ) : (
            <span className="label-micro truncate">{it.label}</span>
          )}
          <Num className="text-md leading-none" tone={it.tone}>
            {it.value}
          </Num>
        </div>
      ))}
    </div>
  );
}

/** A faint "what this means" line — the one bit of teaching a newcomer needs.
 *  Optional; only when it genuinely adds understanding the verdict can't. */
export function LightNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-data leading-relaxed text-text-dim", className)}>
      {children}
    </p>
  );
}
