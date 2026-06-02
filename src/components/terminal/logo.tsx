/**
 * DeepSkew mark — the implied-vol skew curve (steep put wing on the left, ATM
 * minimum, gentler call wing) that is the product's signature. `currentColor`
 * so it inherits the cerulean accent.
 */
export function DeepSkewMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2.5 6.5C6 17 9.5 16.5 12 13.5C15 10 18 9.5 21.5 11.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11.6" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}
