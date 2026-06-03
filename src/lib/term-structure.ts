import type { OracleInfo } from "@/lib/indexer/types";
import type { SviParams } from "@/lib/svi";

export interface TermRow {
  oracleId: string;
  expiry: number;
  T: number;
  params: SviParams;
  atmIV: number;
}

// The surface draws every live expiry as a real rib, so the term structure is
// as dense as the venue actually is (typically ~18 expiries: clustered intraday,
// thinning out to a few weeks). Capped so a runaway expiry count can't blow up
// the geometry / per-tenor SVI fan-out; if exceeded, we keep both ends and
// evenly thin the middle.
const MAX_TENORS = 24;

/** Every active, not-yet-expired oracle as a tenor — one per distinct expiry,
 *  sorted nearest-first, thinned to MAX_TENORS if the venue ever has more. */
export function selectTermStructure(
  oracles: OracleInfo[],
  nowMs: number,
): OracleInfo[] {
  if (!oracles.length) return [];

  const seen = new Set<number>();
  const future: OracleInfo[] = [];
  for (const o of [...oracles].sort((a, b) => a.expiry - b.expiry)) {
    if (o.expiry <= nowMs || seen.has(o.expiry)) continue;
    seen.add(o.expiry);
    future.push(o);
  }
  if (future.length <= MAX_TENORS) return future;

  // Too many: keep first + last, evenly sample the rest by index.
  const out: OracleInfo[] = [];
  for (let i = 0; i < MAX_TENORS; i++) {
    const idx = Math.round((i * (future.length - 1)) / (MAX_TENORS - 1));
    const o = future[idx];
    if (o && out[out.length - 1] !== o) out.push(o);
  }
  return out;
}
