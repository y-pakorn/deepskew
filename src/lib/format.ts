import { PRICE_FIXED_POINT } from "@/lib/sui/constants";

/** Formatting helpers for the terminal. Numbers render in tabular mono. */

export function truncateAddr(addr: string, lead = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= lead + tail + 1) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export function fmtCompact(n: number): string {
  return Number.isFinite(n) ? compact.format(n) : "—";
}

export function fmtNum(n: number, digits = 2): string {
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "—";
}

export function fmtUsd(n: number, digits = 2): string {
  return Number.isFinite(n) ? `$${fmtNum(n, digits)}` : "—";
}

export function fmtUsdCompact(n: number): string {
  return Number.isFinite(n) ? `$${compact.format(n)}` : "—";
}

/** Fraction (0.0008) → percent string ("0.08%"). */
export function fmtPct(fraction: number, digits = 2): string {
  return Number.isFinite(fraction)
    ? `${(fraction * 100).toFixed(digits)}%`
    : "—";
}

/** Already-percent value (16.9) → "16.9%". */
export function fmtPctValue(value: number, digits = 1): string {
  return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
}

/** Scale raw quote units (e.g. dUSDC 1e6) to human. */
export function fromUnits(raw: number, decimals: number): number {
  return raw / 10 ** decimals;
}

export function fmtSigned(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  const s = fmtNum(Math.abs(n), digits);
  return n >= 0 ? `+${s}` : `−${s}`;
}

/** 1e9-scaled price → float. */
export function priceToFloat(raw: number, scale = PRICE_FIXED_POINT): number {
  return raw / scale;
}

/** 1e9-scaled price → "$69,315". */
export function fmtPrice(raw: number, digits = 0): string {
  const v = priceToFloat(raw);
  return Number.isFinite(v)
    ? `$${v.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}`
    : "—";
}

/** Duration (ms) → compact countdown: "2d 3h", "1h 56m", "11m 24s", "8s". */
export function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "expired";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** A short UTC HH:MM:SS clock string. */
export function utcClock(d: Date): string {
  return d.toISOString().slice(11, 19);
}
