/** Surface glow ramp — a cool cerulean gradient (on-brand) that still encodes
 *  IV magnitude: deep blue in the valleys → cyan → hot near-white at the peaks.
 *  Bright peaks bloom; the low end stays calm. */

type RGB = [number, number, number];

const STOPS: [number, RGB][] = [
  [0.0, [0.1, 0.2, 0.48]], // deep blue (low IV)
  [0.4, [0.05, 0.55, 0.85]], // cerulean
  [0.72, [0.13, 0.83, 0.93]], // cyan
  [1.0, [0.72, 0.97, 1.0]], // hot near-white cyan (high IV)
];

/** Map t∈[0,1] to an RGB triplet (0..1 components, for three vertex colors). */
export function heatColor(t: number): RGB {
  const x = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (x <= t1) {
      const f = (x - t0) / (t1 - t0 || 1);
      return [
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}
