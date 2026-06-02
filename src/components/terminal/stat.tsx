import { cn } from "@/lib/utils";

export type Tone = "default" | "safe" | "warn" | "breach" | "accent" | "dim";

export function toneClass(tone: Tone = "default"): string {
  return {
    default: "text-foreground",
    safe: "text-safe",
    warn: "text-warn",
    breach: "text-breach",
    accent: "text-accent-brand",
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
    dim: "bg-text-faint",
  }[tone];
}

/** A label → value row. Quiet label, tabular-mono value, right-aligned. */
export function Stat({
  label,
  value,
  tone = "default",
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="label-micro shrink-0">{label}</span>
      <span
        className={cn(
          "truncate text-[13px] leading-none",
          mono && "font-mono tabular",
          toneClass(tone),
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** The panel's headline answer: a status dot + tone-colored verdict. Emphasis
 *  comes from size + color (no bold), per the Tatem system. */
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
        "flex items-center gap-3 rounded-md border border-hairline bg-panel-elev/40 px-3 py-2",
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dotClass(tone))} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate font-mono text-[15px] leading-tight",
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
