import { heatColor } from "./heat";
import { totalVariance, type SviParams } from "./svi";

/** One expiry slice of the surface. */
export interface SurfaceRow {
  T: number; // years to expiry
  params: SviParams;
}

export interface SurfaceGeometryData {
  positions: Float32Array;
  /** Full-brightness heat colors for the solid sheet. */
  colors: Float32Array;
  /** Heat colors dimmed on interpolated ribs (the wireframe). */
  lineColors: Float32Array;
  /** Triangle index (for the faint solid sheet). */
  indices: Uint16Array;
  /** Line-segment index for a clean quad grid (rows + columns, no diagonals). */
  lineIndices: Uint16Array;
  /** Per render-row time-to-expiry in years (real + interpolated ribs). */
  rowT: Float32Array;
  /** Per render-row flag: 1 = real oracle tenor, 0 = interpolated. */
  rowReal: Uint8Array;
  /** Per render-row: render-row index of the nearest real oracle tenor. */
  nearestRealRow: Int16Array;
  /** Per render-row: index into the input rows of the nearest real tenor. */
  nearestRealIdx: Int16Array;
  /** Per real tenor (input order): its render-row index in the grid. */
  realRows: Int16Array;
  /** Per-column log-moneyness. */
  colK: Float32Array;
  /** Raw IV per node (nr × nk, row-major) — for the hover readout. */
  ivGrid: Float32Array;
  nr: number; // render rows (real + interpolated)
  nk: number; // strike samples
  ivMin: number;
  ivMax: number;
}

// Grid + world-space scaling. The axis half-spans are exported so the pointer
// picker can invert a world-space hit back into (row, column).
export const K_MIN = -0.2;
export const K_MAX = 0.2;
export const X_HALF = 1.9; // strike axis half-width
export const Z_HALF = 1.25; // expiry axis half-depth
export const Y_SCALE = 1.0; // IV height

const NK = 64; // log-moneyness samples per expiry
const TARGET_RIBS = 26; // depth resolution we aim for after interpolation
const INTERP_DIM = 0.42; // wireframe brightness of interpolated ribs vs real ones
const IV_CLAMP = 1.0; // cap blown-up near-expiry wings so the body keeps relief

/**
 * Build a glowing-surface mesh from stacked SVI smiles. Rows must be sorted by
 * T ascending. Returns null if fewer than 2 valid expiries.
 *
 * Density: NK strike samples per rib. Every input row is a real expiry; when the
 * set is sparse we insert interpolated ribs to reach TARGET_RIBS depth. Interp is
 * done in *total-variance* space and linearly in T, which keeps the in-between
 * ribs calendar-arbitrage-free as long as the bracketing real slices are.
 * Interpolated ribs are dimmed in the wireframe so the real oracle tenors still
 * read as the bright structural lines.
 *
 * Height + color are normalized IV across the surface so it fills the frame at
 * any vol level.
 */
export function buildSurface(rows: SurfaceRow[]): SurfaceGeometryData | null {
  const realN = rows.length;
  if (realN < 2) return null;
  const nk = NK;
  // Interpolate only enough to reach the target depth resolution: when the venue
  // already lists many expiries, draw them straight (subdiv 1, no synthetic
  // ribs); when it's sparse, smooth the gaps so the sheet doesn't look faceted.
  const subdiv = Math.max(
    1,
    Math.min(8, Math.round((TARGET_RIBS - 1) / (realN - 1))),
  );

  // Strike columns (shared by every rib).
  const colK = new Float32Array(nk);
  for (let c = 0; c < nk; c++) {
    colK[c] = K_MIN + (K_MAX - K_MIN) * (c / (nk - 1));
  }

  // Total variance per real rib — the quantity we interpolate in.
  const realW = rows.map((row) => {
    const w = new Float32Array(nk);
    for (let c = 0; c < nk; c++) w[c] = totalVariance(colK[c], row.params);
    return w;
  });

  // Assemble render ribs: each real tenor, then subdiv-1 interpolated ribs
  // bridging to the next real tenor.
  const rowTArr: number[] = [];
  const rowRealArr: number[] = [];
  const wRows: Float32Array[] = [];
  for (let r = 0; r < realN; r++) {
    rowTArr.push(rows[r].T);
    rowRealArr.push(1);
    wRows.push(realW[r]);
    if (r < realN - 1) {
      const T0 = rows[r].T;
      const T1 = rows[r + 1].T;
      for (let s = 1; s < subdiv; s++) {
        const f = s / subdiv;
        const w = new Float32Array(nk);
        for (let c = 0; c < nk; c++) {
          w[c] = realW[r][c] + (realW[r + 1][c] - realW[r][c]) * f;
        }
        rowTArr.push(T0 + (T1 - T0) * f);
        rowRealArr.push(0);
        wRows.push(w);
      }
    }
  }
  const nr = wRows.length;

  // IV grid + range for normalization.
  const ivGrid = new Float32Array(nr * nk);
  let ivMin = Infinity;
  let ivMax = -Infinity;
  for (let r = 0; r < nr; r++) {
    const T = rowTArr[r];
    for (let c = 0; c < nk; c++) {
      const w = wRows[r][c];
      let v = T > 0 && w > 0 ? Math.sqrt(w / T) : 0;
      if (!Number.isFinite(v)) v = 0;
      v = Math.min(v, IV_CLAMP);
      ivGrid[r * nk + c] = v;
      if (v < ivMin) ivMin = v;
      if (v > ivMax) ivMax = v;
    }
  }
  const span = ivMax - ivMin || 1;

  const positions = new Float32Array(nr * nk * 3);
  const colors = new Float32Array(nr * nk * 3);
  const lineColors = new Float32Array(nr * nk * 3);
  for (let r = 0; r < nr; r++) {
    // Earliest tenor (row 0) sits at +Z, nearest the camera; the term structure
    // recedes into the distance as T grows.
    const z = (0.5 - r / (nr - 1)) * 2 * Z_HALF;
    const dim = rowRealArr[r] ? 1 : INTERP_DIM;
    for (let c = 0; c < nk; c++) {
      const norm = (ivGrid[r * nk + c] - ivMin) / span;
      const i3 = (r * nk + c) * 3;
      positions[i3] = (c / (nk - 1) - 0.5) * 2 * X_HALF;
      positions[i3 + 1] = norm * Y_SCALE;
      positions[i3 + 2] = z;
      const [cr, cg, cb] = heatColor(norm);
      colors[i3] = cr;
      colors[i3 + 1] = cg;
      colors[i3 + 2] = cb;
      lineColors[i3] = cr * dim;
      lineColors[i3 + 1] = cg * dim;
      lineColors[i3 + 2] = cb * dim;
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

  // Map every render row to its nearest real tenor, so the hover picker can
  // snap an interpolated rib back onto the real oracle tenor it sits between.
  const realRows: number[] = [];
  for (let r = 0; r < nr; r++) if (rowRealArr[r]) realRows.push(r);
  const nearestRealRow = new Int16Array(nr);
  const nearestRealIdx = new Int16Array(nr);
  for (let r = 0; r < nr; r++) {
    let bestJ = 0;
    let bestD = Infinity;
    for (let j = 0; j < realRows.length; j++) {
      const d = Math.abs(realRows[j] - r);
      if (d < bestD) {
        bestD = d;
        bestJ = j;
      }
    }
    nearestRealRow[r] = realRows[bestJ];
    nearestRealIdx[r] = bestJ;
  }

  return {
    positions,
    colors,
    lineColors,
    indices: Uint16Array.from(tris),
    lineIndices: Uint16Array.from(lines),
    rowT: Float32Array.from(rowTArr),
    rowReal: Uint8Array.from(rowRealArr),
    nearestRealRow,
    nearestRealIdx,
    realRows: Int16Array.from(realRows),
    colK,
    ivGrid,
    nr,
    nk,
    ivMin,
    ivMax,
  };
}
