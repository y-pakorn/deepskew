import { heatColor } from "./heat";
import { impliedVol, type SviParams } from "./svi";

/** One expiry slice of the surface. */
export interface SurfaceRow {
  T: number; // years to expiry
  params: SviParams;
}

export interface SurfaceGeometryData {
  positions: Float32Array;
  colors: Float32Array;
  /** Triangle index (for the faint solid sheet). */
  indices: Uint16Array;
  /** Line-segment index for a clean quad grid (rows + columns, no diagonals). */
  lineIndices: Uint16Array;
  nr: number;
  nk: number;
  ivMin: number;
  ivMax: number;
}

// Grid + world-space scaling.
const K_MIN = -0.2;
const K_MAX = 0.2;
const NK = 44; // log-moneyness samples per expiry
const IV_CLAMP = 1.0; // cap blown-up near-expiry wings so the body keeps relief
const X_HALF = 1.9; // strike axis half-width
const Z_HALF = 1.25; // expiry axis half-depth
const Y_SCALE = 1.0; // IV height

/**
 * Build a glowing-surface mesh from stacked SVI smiles. Rows must be sorted by
 * T ascending. Returns null if fewer than 2 valid expiries. Height + color are
 * normalized IV across the surface so it fills the frame at any vol level.
 */
export function buildSurface(rows: SurfaceRow[]): SurfaceGeometryData | null {
  const nr = rows.length;
  if (nr < 2) return null;
  const nk = NK;

  const iv = new Float32Array(nr * nk);
  let ivMin = Infinity;
  let ivMax = -Infinity;
  for (let r = 0; r < nr; r++) {
    for (let c = 0; c < nk; c++) {
      const k = K_MIN + (K_MAX - K_MIN) * (c / (nk - 1));
      let v = impliedVol(k, rows[r].params, rows[r].T);
      if (!Number.isFinite(v)) v = 0;
      v = Math.min(v, IV_CLAMP);
      iv[r * nk + c] = v;
      if (v < ivMin) ivMin = v;
      if (v > ivMax) ivMax = v;
    }
  }
  const span = ivMax - ivMin || 1;

  const positions = new Float32Array(nr * nk * 3);
  const colors = new Float32Array(nr * nk * 3);
  for (let r = 0; r < nr; r++) {
    const z = nr === 1 ? 0 : (r / (nr - 1) - 0.5) * 2 * Z_HALF;
    for (let c = 0; c < nk; c++) {
      const norm = (iv[r * nk + c] - ivMin) / span;
      const i3 = (r * nk + c) * 3;
      positions[i3] = (c / (nk - 1) - 0.5) * 2 * X_HALF;
      positions[i3 + 1] = norm * Y_SCALE;
      positions[i3 + 2] = z;
      const [cr, cg, cb] = heatColor(norm);
      colors[i3] = cr;
      colors[i3 + 1] = cg;
      colors[i3 + 2] = cb;
    }
  }

  // Triangles for the solid sheet.
  const tris: number[] = [];
  for (let r = 0; r < nr - 1; r++) {
    for (let c = 0; c < nk - 1; c++) {
      const a = r * nk + c;
      const b = a + 1;
      const d = (r + 1) * nk + c;
      const e = d + 1;
      tris.push(a, d, b, b, d, e);
    }
  }

  // Quad-grid lines: smile lines (along k) + term-structure lines (along T).
  const lines: number[] = [];
  for (let r = 0; r < nr; r++) {
    for (let c = 0; c < nk - 1; c++) lines.push(r * nk + c, r * nk + c + 1);
  }
  for (let c = 0; c < nk; c++) {
    for (let r = 0; r < nr - 1; r++) lines.push(r * nk + c, (r + 1) * nk + c);
  }

  return {
    positions,
    colors,
    indices: Uint16Array.from(tris),
    lineIndices: Uint16Array.from(lines),
    nr,
    nk,
    ivMin,
    ivMax,
  };
}
