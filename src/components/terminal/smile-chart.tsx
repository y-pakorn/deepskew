/** Smile cross-section: IV vs log-moneyness, with ATM marker. SVG draws the
 *  curve (stretched to fill, crisp via non-scaling-stroke); labels are HTML. */
const VB = 100;

export function SmileChart({ pts }: { pts: { k: number; iv: number }[] }) {
  if (pts.length < 2) return null;
  const ivs = pts.map((p) => p.iv);
  let lo = Math.min(...ivs);
  let hi = Math.max(...ivs);
  const pad = (hi - lo) * 0.12 || 0.02;
  lo -= pad;
  hi += pad;

  const sx = (i: number) => (i / (pts.length - 1)) * VB;
  const sy = (iv: number) => VB - ((iv - lo) / (hi - lo || 1)) * VB;
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${sx(i).toFixed(2)} ${sy(p.iv).toFixed(2)}`)
    .join(" ");
  const area = `${line} L${VB} ${VB} L0 ${VB} Z`;

  const k0 = pts[0].k;
  const k1 = pts[pts.length - 1].k;
  const atmX = ((0 - k0) / (k1 - k0)) * VB;

  return (
    <div className="relative min-h-[140px] w-full flex-1">
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="smileFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-brand)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1={VB / 2}
          x2={VB}
          y2={VB / 2}
          stroke="var(--hairline)"
          strokeWidth="0.5"
        />
        <line
          x1={atmX}
          y1="0"
          x2={atmX}
          y2={VB}
          stroke="var(--text-faint)"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
        <path d={area} fill="url(#smileFill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--accent-brand)"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="label-micro absolute left-1 top-0.5 text-text-faint">
        {(hi * 100).toFixed(0)}%
      </span>
      <span className="label-micro absolute bottom-0.5 left-1 text-text-faint">
        {(k0 * 100).toFixed(0)}%
      </span>
      <span className="label-micro absolute bottom-0.5 left-1/2 -translate-x-1/2 text-text-faint">
        ATM
      </span>
      <span className="label-micro absolute right-1 bottom-0.5 text-text-faint">
        +{(k1 * 100).toFixed(0)}%
      </span>
    </div>
  );
}
