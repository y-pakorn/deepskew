import { cn } from "@/lib/utils";

export type PillTone = "neutral" | "up" | "down" | "accent" | "key" | "warn";

const tones: Record<PillTone, string> = {
  neutral: "bg-panel-elev text-text-sec",
  up: "bg-safe/12 text-safe",
  down: "bg-breach/12 text-breach",
  accent: "bg-accent-brand/12 text-accent-brand",
  key: "bg-accent-brand/12 text-accent-brand",
  warn: "bg-warn/12 text-warn",
};

/** Compact capsule status tag (Fey-style). Color carries information. */
export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-data leading-none font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
