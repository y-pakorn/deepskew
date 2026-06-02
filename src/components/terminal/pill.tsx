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
      // 12px via inline style: tailwind-merge drops the custom `text-data` size
      // class when it co-occurs with a `text-{color}` (it can't tell size from
      // color for non-default tokens), so set the size where it can't be merged.
      style={{ fontSize: "0.75rem" }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 leading-none font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
