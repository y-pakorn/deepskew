import { cn } from "@/lib/utils";

/**
 * The deepskew brand signature: the implied-vol skew curve (steep put wing left,
 * an ATM-minimum dot, a gentler call wing right) shared with `DeepSkewMark`, the
 * favicon, and the OG cards. Two scales, deliberately different in color:
 *
 * - `motif` — flat cerulean, for chrome (eyebrows, the TOC head). Cerulean stays
 *   the data/interaction signal at structural scale.
 * - `hero` — the ONE place the surface heat ramp is allowed off the surface: the
 *   curve carries an indigo→cyan→green→amber gradient ALONG its length and reads
 *   as a single illustration, not decoration. The ATM dot stays cerulean (the
 *   reference marker). Rendered static (the manual carries no motion).
 */
const SKEW_PATH = "M2.5 6.5C6 17 9.5 16.5 12 13.5C15 10 18 9.5 21.5 11.5";

export function SkewSignature({
  variant = "motif",
  className,
}: {
  variant?: "motif" | "hero";
  className?: string;
}) {
  if (variant === "motif") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn("text-accent-brand", className)}
      >
        <path
          d={SKEW_PATH}
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={11.6} cy={14} r={1.2} fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient
          id="ds-skew-heat"
          x1="0"
          y1="0"
          x2="24"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="38%" stopColor="#06b6d4" />
          <stop offset="64%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <path
        d={SKEW_PATH}
        stroke="url(#ds-skew-heat)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={11.6} cy={14} r={1.35} fill="var(--accent-brand)" />
    </svg>
  );
}
