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

const verdictRing: Record<Tone, string> = {
  default: "border-hairline",
  safe: "border-safe/30",
  warn: "border-warn/30",
  breach: "border-breach/40",
  accent: "border-accent-brand/30",
  dim: "border-hairline",
};

/** A label → value row. Values are tabular mono and right-aligned. */
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
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
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

/** The big "answer" of a panel: one verdict in mono with a semantic tone. */
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
        "flex flex-col gap-1 rounded-md border px-3 py-2",
        verdictRing[tone],
        className,
      )}
    >
      <span
        className={cn(
          "font-mono text-[15px] font-medium leading-none tracking-tight",
          toneClass(tone),
        )}
      >
        {children}
      </span>
      {sub ? <span className="label-micro">{sub}</span> : null}
    </div>
  );
}

/** A thin utilization meter (value 0..1). */
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
