import type { OracleInfo } from "@/lib/indexer/types";
import type { SviParams } from "@/lib/svi";

export interface TermRow {
  oracleId: string;
  expiry: number;
  T: number;
  params: SviParams;
  atmIV: number;
}

// Log-spaced tenors (~30m → ~2w) so the surface / term structure read as a real
// curve instead of a cluster of near-identical intraday smiles.
const TENOR_TARGETS_MIN = [30, 60, 120, 240, 480, 1440, 2880, 10080, 20160];

/** Pick one active oracle nearest each target horizon, deduped, sorted by expiry. */
export function selectTermStructure(
  oracles: OracleInfo[],
  nowMs: number,
): OracleInfo[] {
  if (!oracles.length) return [];
  const picked = new Map<string, OracleInfo>();
  for (const min of TENOR_TARGETS_MIN) {
    const want = nowMs + min * 60_000;
    let best: OracleInfo | null = null;
    let bestD = Infinity;
    for (const o of oracles) {
      const d = Math.abs(o.expiry - want);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    if (best) picked.set(best.oracle_id, best);
  }
  return [...picked.values()].sort((a, b) => a.expiry - b.expiry);
}
