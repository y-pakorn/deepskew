/* eslint-disable @next/next/no-img-element -- Satori renders these to a static
   image; next/image does not apply inside next/og. */
/**
 * The one social-card renderer behind every route's opengraph-image and
 * twitter-image. It is the same Tatem component language on every card (command
 * strip, value-led verdict, hairline-tiled stats, status bar) but each route
 * leads with a big hero naming the page and shows that route's own instrument:
 * the desk leads with spot + the IV surface, vol with the 25-delta skew + the
 * smile, flow with per-fill edge, risk with the LP grade, and so on. Everything
 * is live from the indexer snapshot, with a static fallback.
 *
 * Satori (next/og) constraints: flexbox only, inline styles only, fonts as
 * binary data, charts inlined as base64 SVG <img>.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { fmtDuration } from "@/lib/format";
import { skewMetrics, smile, type SviParams } from "@/lib/svi";
import { OG_ROUTES, type OgRouteKey } from "./meta";
import { loadOgSnapshot, type OgSnapshot, type TapeRow } from "./snapshot";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/jpeg";

// Tatem tokens (mirror of src/app/globals.css).
const CANVAS = "#000000";
const PANEL = "#0c0c0c";
const HAIRLINE = "#232323";
const TEXT = "#ffffff";
const TEXT_SEC = "#c4c4c4";
const TEXT_DIM = "#a8a8a8";
const TEXT_FAINT = "#8a8a8a";
const BRAND = "#007eed";
const SAFE = "#34d399";
const WARN = "#fbbf24";
const BREACH = "#f43f5e";

const SANS = "Geist";
const MONO = "Geist Mono";

const toneColor = (t: Tone) =>
  t === "safe" ? SAFE : t === "warn" ? WARN : t === "breach" ? BREACH : t === "accent" ? BRAND : TEXT;
type Tone = "default" | "safe" | "warn" | "breach" | "accent";

// ── Fonts (vendored TTFs; Geist 400/600 + Geist Mono 500) ───────────────────
const FONT_DIR = join(process.cwd(), "src/lib/og/fonts");
const fonts = Promise.all([
  readFile(join(FONT_DIR, "Geist-Regular.ttf")),
  readFile(join(FONT_DIR, "Geist-SemiBold.ttf")),
  readFile(join(FONT_DIR, "GeistMono-Medium.ttf")),
]);

// ── SVG art ─────────────────────────────────────────────────────────────────
const dataUri = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const MARK_URI = dataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M2.5 6.5C6 17 9.5 16.5 12 13.5C15 10 18 9.5 21.5 11.5" stroke="${BRAND}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11.6" cy="14" r="1.5" fill="${BRAND}"/></svg>`,
);

/** Cerulean wireframe surface: perspective rows + columns, strike wings up. */
function meshUri(w: number, h: number): string {
  const R = 8;
  const C = 15;
  const A = h * 0.24;
  const pt = (r: number, c: number): [number, number] => {
    const d = r / (R - 1);
    const t = c / (C - 1);
    const inset = (1 - d) * (w * 0.1);
    const x = inset + t * (w - 2 * inset);
    const baseY = h * 0.2 + d * (h * 0.66);
    const z = A * (0.45 + 0.55 * d) * (2 * t - 1) * (2 * t - 1);
    return [x, baseY - z];
  };
  const lines: string[] = [];
  for (let r = 0; r < R; r++) {
    const p: string[] = [];
    for (let c = 0; c < C; c++) {
      const [x, y] = pt(r, c);
      p.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    lines.push(
      `<polyline points="${p.join(" ")}" fill="none" stroke="${BRAND}" stroke-width="1.7" stroke-opacity="${(0.22 + 0.6 * (r / (R - 1))).toFixed(2)}"/>`,
    );
  }
  for (let c = 0; c < C; c++) {
    const p: string[] = [];
    for (let r = 0; r < R; r++) {
      const [x, y] = pt(r, c);
      p.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    lines.push(
      `<polyline points="${p.join(" ")}" fill="none" stroke="${BRAND}" stroke-width="1" stroke-opacity="0.24"/>`,
    );
  }
  return dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">${lines.join("")}</svg>`,
  );
}

/** The volatility smile from live SVI params (synthetic U if unavailable). */
function smileUri(w: number, h: number, svi: SviParams | null, T: number | null): string {
  let pts: { k: number; iv: number }[] = [];
  if (svi && T && T > 0) pts = smile(svi, T, { kMin: -0.9, kMax: 0.9, steps: 64 });
  if (pts.length < 2) {
    pts = [];
    for (let i = 0; i <= 64; i++) {
      const k = -0.9 + (1.8 * i) / 64;
      pts.push({ k, iv: 0.5 + 0.55 * k * k });
    }
  }
  const ivs = pts.map((p) => p.iv);
  const lo = Math.min(...ivs);
  const hi = Math.max(...ivs);
  const rng = hi - lo || 1;
  const xOf = (k: number) => 10 + ((k + 0.9) / 1.8) * (w - 20);
  const yOf = (iv: number) => h - 16 - ((iv - lo) / rng) * (h - 38);
  const poly = pts.map((p) => `${xOf(p.k).toFixed(1)},${yOf(p.iv).toFixed(1)}`).join(" ");
  const atm = pts.reduce((a, b) => (Math.abs(b.k) < Math.abs(a.k) ? b : a));
  const area = `M${xOf(-0.9).toFixed(1)},${h} L ${poly} L ${xOf(0.9).toFixed(1)},${h} Z`;
  return dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
      <path d="${area}" fill="${BRAND}" fill-opacity="0.12"/>
      <line x1="${xOf(0).toFixed(1)}" y1="6" x2="${xOf(0).toFixed(1)}" y2="${h}" stroke="${HAIRLINE}" stroke-width="1.5" stroke-dasharray="3 6"/>
      <polyline points="${poly}" fill="none" stroke="${BRAND}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${xOf(0).toFixed(1)}" cy="${yOf(atm.iv).toFixed(1)}" r="6" fill="${TEXT}"/>
    </svg>`,
  );
}

// ── Value formatting ────────────────────────────────────────────────────────
const compactUsd = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const usd0 = (n: number | null) =>
  n == null || !Number.isFinite(n) ? "n/a" : `$${Math.round(n).toLocaleString("en-US")}`;
const usdC = (n: number | null) =>
  n == null || !Number.isFinite(n) ? "n/a" : `$${compactUsd.format(n)}`;
const pct1 = (n: number | null) =>
  n == null || !Number.isFinite(n) ? "n/a" : `${(n * 100).toFixed(1)}%`;
const pct2 = (n: number | null) =>
  n == null || !Number.isFinite(n) ? "n/a" : `${(n * 100).toFixed(2)}%`;
const pct0 = (n: number | null) =>
  n == null || !Number.isFinite(n) ? "n/a" : `${Math.round(n * 100)}%`;
const pts1 = (n: number | null) =>
  n == null || !Number.isFinite(n) ? "n/a" : `${n >= 0 ? "+" : ""}${n.toFixed(1)} pts`;
const share4 = (n: number | null) =>
  n == null || !Number.isFinite(n) ? "n/a" : n.toFixed(4);
const intStr = (n: number | null) => (n == null || !Number.isFinite(n) ? "n/a" : String(n));
const clock = (ts: number) => new Date(ts).toISOString().slice(11, 19);
const expiryLabel = (ms: number | null) => (ms == null ? null : fmtDuration(ms - Date.now()));

// ── Small building blocks ───────────────────────────────────────────────────
function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone | "neutral" }) {
  const map: Record<string, { bg: string; fg: string }> = {
    safe: { bg: "rgba(52,211,153,0.12)", fg: SAFE },
    warn: { bg: "rgba(251,191,36,0.12)", fg: WARN },
    breach: { bg: "rgba(244,63,94,0.12)", fg: BREACH },
    accent: { bg: "rgba(0,126,237,0.12)", fg: BRAND },
    neutral: { bg: "#1e1e1e", fg: TEXT_SEC },
    default: { bg: "#1e1e1e", fg: TEXT_SEC },
  };
  const c = map[tone] ?? map.neutral;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: c.bg,
        color: c.fg,
        borderRadius: 999,
        padding: "4px 11px",
        fontFamily: SANS,
        fontWeight: 500,
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}

function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <div style={{ display: "flex", width: size, height: size, borderRadius: 999, background: color }} />;
}

function BarRow({ label, value, frac, color }: { label: string; value: string; frac: number; color: string }) {
  const pct = Math.max(0, Math.min(1, frac)) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ display: "flex", fontFamily: SANS, fontSize: 16, color: TEXT_DIM }}>{label}</div>
        <div style={{ display: "flex", fontFamily: MONO, fontWeight: 500, fontSize: 19, color: TEXT }}>{value}</div>
      </div>
      <div style={{ display: "flex", height: 10, borderRadius: 999, background: "#1e1e1e" }}>
        <div style={{ display: "flex", width: `${pct}%`, height: 10, borderRadius: 999, background: color }} />
      </div>
    </div>
  );
}

function Tile({ label, value, color = TEXT, first }: { label: string; value: string; color?: string; first?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        flex: 1,
        padding: "0 24px",
        borderLeft: first ? "none" : `1px solid ${HAIRLINE}`,
      }}
    >
      <div style={{ display: "flex", fontFamily: SANS, fontSize: 15, color: TEXT_DIM }}>{label}</div>
      <div style={{ display: "flex", fontFamily: MONO, fontWeight: 500, fontSize: 27, letterSpacing: -0.5, color }}>
        {value}
      </div>
    </div>
  );
}

function TapeChart({ tape }: { tape: TapeRow[] }) {
  if (!tape.length) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", fontFamily: SANS, fontSize: 16, color: TEXT_FAINT }}>
        No recent fills
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 10 }}>
      <div style={{ display: "flex", fontFamily: SANS, fontSize: 13, color: TEXT_FAINT }}>
        <div style={{ display: "flex", width: 96 }}>Time</div>
        <div style={{ display: "flex", width: 60 }}>Side</div>
        <div style={{ display: "flex", flex: 1 }}>Strike</div>
        <div style={{ display: "flex" }}>Premium</div>
      </div>
      {tape.map((row, i) => (
        <div key={i} style={{ display: "flex", fontFamily: MONO, fontWeight: 500, fontSize: 17, color: TEXT_SEC }}>
          <div style={{ display: "flex", width: 96, color: TEXT_DIM }}>{clock(row.ts)}</div>
          <div style={{ display: "flex", width: 60, color: row.isUp ? SAFE : BREACH }}>{row.isUp ? "Up" : "Dn"}</div>
          <div style={{ display: "flex", flex: 1 }}>${Math.round(row.strike).toLocaleString("en-US")}</div>
          <div style={{ display: "flex" }}>${row.premium.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}

function riskGrade(util: number | null, mpu: number | null): { label: string; tone: Tone } {
  const u = Math.max(util ?? 0, mpu ?? 0);
  if (u > 0.9) return { label: "RED", tone: "breach" };
  if (u > 0.75) return { label: "AMBER", tone: "warn" };
  return { label: "GREEN", tone: "safe" };
}

function opsStatus(live: boolean, lag: number | null): { label: string; tone: Tone } {
  if (!live) return { label: "Degraded", tone: "breach" };
  if (lag != null && lag > 60) return { label: "Behind", tone: "breach" };
  if (lag != null && lag > 10) return { label: "Syncing", tone: "warn" };
  return { label: "Operational", tone: "safe" };
}

interface Verdict {
  label: string;
  value: string;
  sub: string;
  tone: Tone;
  mono: boolean;
}
interface RouteContent {
  tagline: string;
  verdict: Verdict;
  chart: "mesh" | "smile" | "tape" | "meter" | "health" | "vrpbars";
  chartTitle: string;
  chartCode: string;
  headerPill?: { text: string; tone: Tone };
  tiles: { label: string; value: string; color?: string }[];
}

function routeContent(route: OgRouteKey, s: OgSnapshot): RouteContent {
  const skew = s.svi && s.T ? skewMetrics(s.svi, s.T) : null;
  const vrp = s.atmIV != null && s.vol24h != null ? (s.atmIV - s.vol24h) * 100 : null;
  const exp = expiryLabel(s.expiryMs) ?? "n/a";

  switch (route) {
    case "vol": {
      const rr = skew?.rr25 ?? null;
      return {
        tagline: "Smile, skew, term structure and the risk-neutral density.",
        verdict: {
          label: "25Δ risk reversal",
          value: pts1(rr),
          sub: rr == null ? "Reconstructing smile" : `${rr < 0 ? "Put" : "Call"} skew · fly ${(skew?.bf25 ?? 0).toFixed(1)}`,
          tone: rr == null ? "default" : rr < 0 ? "warn" : "safe",
          mono: true,
        },
        chart: "smile",
        chartTitle: "Vol smile",
        chartCode: "IV",
        headerPill: { text: "Live", tone: "accent" },
        tiles: [
          { label: "ATM IV", value: pct1(s.atmIV) },
          { label: "25Δ RR", value: skew ? pts1(skew.rr25) : "n/a" },
          { label: "25Δ fly", value: skew ? `${skew.bf25.toFixed(1)} pts` : "n/a" },
          { label: "Tenors", value: intStr(s.tenors) },
        ],
      };
    }
    case "flow": {
      const e = s.edgeBps;
      return {
        tagline: "Every fill scored against fair value, fill by fill.",
        verdict: {
          label: "Mean edge per fill",
          value: e == null ? "n/a" : `${e >= 0 ? "+" : ""}${Math.round(e)} bps`,
          sub: "Paid vs model-fair N(d2)",
          tone: e == null ? "default" : e >= 0 ? "safe" : "breach",
          mono: true,
        },
        chart: "tape",
        chartTitle: "Recent fills",
        chartCode: "flow",
        tiles: [
          { label: "VRP", value: pts1(vrp) },
          { label: "Taker win", value: pct0(s.winRate) },
          { label: "Settled", value: intStr(s.settledCount) },
          { label: "Mints", value: intStr(s.mintCount) },
        ],
      };
    }
    case "risk": {
      const g = riskGrade(s.utilization, s.maxPayoutUtil);
      return {
        tagline: "Is the PLP vault solvent through a five-sigma move?",
        verdict: {
          label: "LP risk grade",
          value: g.label,
          sub: `Utilization ${pct2(s.utilization)} · max-payout ${pct2(s.maxPayoutUtil)}`,
          tone: g.tone,
          mono: false,
        },
        chart: "meter",
        chartTitle: "Vault utilization",
        chartCode: "PLP",
        headerPill: { text: g.label, tone: g.tone },
        tiles: [
          { label: "Vault value", value: usdC(s.plp) },
          { label: "Utilization", value: pct2(s.utilization) },
          { label: "Max-payout", value: pct2(s.maxPayoutUtil) },
          { label: "Share px", value: share4(s.sharePrice) },
        ],
      };
    }
    case "managers":
      return {
        tagline: "The desk leaderboard, ranked by PnL and volume.",
        verdict: {
          label: "Active desks",
          value: intStr(s.deskCount),
          sub: `Premium ${usdC(s.mintNotional)} · ${intStr(s.mintCount)} fills`,
          tone: "default",
          mono: true,
        },
        chart: "tape",
        chartTitle: "Recent flow",
        chartCode: "settle",
        tiles: [
          { label: "Desks", value: intStr(s.deskCount) },
          { label: "Premium", value: usdC(s.mintNotional) },
          { label: "Mints", value: intStr(s.mintCount) },
          { label: "Taker win", value: pct0(s.winRate) },
        ],
      };
    case "ops": {
      const o = opsStatus(s.live, s.lagSeconds);
      return {
        tagline: "Oracle freshness and indexer lag, one global verdict.",
        verdict: {
          label: "System status",
          value: o.label,
          sub: `Lag ${s.lagSeconds ?? 0}s · ${s.live ? "trading live" : "indexer idle"}`,
          tone: o.tone,
          mono: false,
        },
        chart: "health",
        chartTitle: "Pipelines",
        chartCode: "live",
        headerPill: { text: o.label, tone: o.tone },
        tiles: [
          { label: "Oracle feeds", value: intStr(s.tenors) },
          { label: "Indexer lag", value: `${s.lagSeconds ?? 0}s` },
          { label: "Checkpoint", value: s.checkpoint == null ? "n/a" : compactUsd.format(s.checkpoint) },
          { label: "Trading", value: s.live ? "Live" : "Idle", color: s.live ? SAFE : TEXT_FAINT },
        ],
      };
    }
    case "cross-venue":
      return {
        tagline: "Predict vol against Deribit and Binance realized.",
        verdict: {
          label: "Implied vs realized",
          value: pts1(vrp),
          sub: `Implied ${pct1(s.atmIV)} vs realized ${pct1(s.vol24h)}`,
          tone: vrp == null ? "default" : vrp >= 0 ? "safe" : "breach",
          mono: true,
        },
        chart: "vrpbars",
        chartTitle: "Vol-risk-premium",
        chartCode: "VRP",
        tiles: [
          { label: "Predict ATM", value: pct1(s.atmIV) },
          { label: "Realized 24h", value: pct1(s.vol24h) },
          { label: "VRP", value: pts1(vrp) },
          { label: "Tenors", value: intStr(s.tenors) },
        ],
      };
    default: // desk
      return {
        tagline: "The on-chain BTC volatility desk for DeepBook Predict.",
        verdict: {
          label: "Spot · BTC",
          value: usd0(s.spot),
          sub: `Forward ${usd0(s.forward)} · expiry ${exp}`,
          tone: "default",
          mono: true,
        },
        chart: "mesh",
        chartTitle: "IV surface",
        chartCode: "BTC · SVI",
        headerPill: s.arbFree !== false ? { text: "Arb-free", tone: "safe" } : { text: "Arb breach", tone: "breach" },
        tiles: [
          { label: "ATM IV", value: pct1(s.atmIV) },
          { label: "24h vol", value: pct1(s.vol24h) },
          { label: "PLP value", value: usdC(s.plp) },
          { label: "Arb", value: s.arbFree !== false ? "Free" : "Breach", color: s.arbFree !== false ? SAFE : BREACH },
        ],
      };
  }
}

function Chart({ kind, snap, w, h }: { kind: RouteContent["chart"]; snap: OgSnapshot; w: number; h: number }) {
  if (kind === "mesh") return <img src={meshUri(w, h)} width={w} height={h} alt="" />;
  if (kind === "smile") return <img src={smileUri(w, h, snap.svi, snap.T)} width={w} height={h} alt="" />;
  if (kind === "tape") return <TapeChart tape={snap.tape} />;
  if (kind === "meter") {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 22 }}>
        <BarRow label="Utilization" value={pct2(snap.utilization)} frac={snap.utilization ?? 0} color={BRAND} />
        <BarRow label="Max-payout utilization" value={pct2(snap.maxPayoutUtil)} frac={snap.maxPayoutUtil ?? 0} color={WARN} />
        <BarRow label="Buffer to cap" value={pct1(snap.utilization == null ? null : 1 - snap.utilization)} frac={1 - (snap.utilization ?? 0)} color={SAFE} />
      </div>
    );
  }
  if (kind === "health") {
    const lag = snap.lagSeconds ?? 0;
    const n = snap.tenors ?? 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 22 }}>
        <BarRow label="Indexer lag (30s window)" value={`${lag}s`} frac={lag / 30} color={lag > 10 ? WARN : SAFE} />
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ display: "flex", fontFamily: SANS, fontSize: 16, color: TEXT_DIM }}>Oracle feeds fresh</div>
            <div style={{ display: "flex", fontFamily: MONO, fontWeight: 500, fontSize: 19, color: TEXT }}>{n}/{n}</div>
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            {Array.from({ length: Math.min(n, 16) }).map((_, i) => (
              <Dot key={i} color={SAFE} size={12} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Dot color={snap.live ? SAFE : TEXT_FAINT} />
          <div style={{ display: "flex", fontFamily: SANS, fontSize: 16, color: TEXT_DIM }}>
            Checkpoint stream {snap.live ? "live" : "idle"}
          </div>
        </div>
      </div>
    );
  }
  // vrpbars
  const max = Math.max(snap.atmIV ?? 0, snap.vol24h ?? 0, 0.01);
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 24 }}>
      <BarRow label="Implied · Predict ATM" value={pct1(snap.atmIV)} frac={(snap.atmIV ?? 0) / max} color={BRAND} />
      <BarRow label="Realized · Binance 24h" value={pct1(snap.vol24h)} frac={(snap.vol24h ?? 0) / max} color={TEXT_DIM} />
    </div>
  );
}

function Card({ route, snap }: { route: OgRouteKey; snap: OgSnapshot }) {
  const meta = OG_ROUTES[route];
  const c = routeContent(route, snap);

  const statusBits: string[] = [snap.live ? "Indexer OK" : "Indexer idle"];
  if (snap.live && snap.lagSeconds != null) statusBits.push(`Lag ${snap.lagSeconds}s`);
  if (snap.checkpoint != null) statusBits.push(`Ckpt ${snap.checkpoint.toLocaleString("en-US")}`);
  statusBits.push("Sui", "testnet");

  return (
    <div
      style={{
        width: ogSize.width,
        height: ogSize.height,
        display: "flex",
        flexDirection: "column",
        background: CANVAS,
        color: TEXT,
        fontFamily: SANS,
      }}
    >
      {/* command strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
          padding: "0 40px",
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <img src={MARK_URI} width={26} height={26} alt="" />
          <div style={{ display: "flex", fontFamily: SANS, fontWeight: 600, fontSize: 26, letterSpacing: -0.5, color: TEXT }}>
            deepskew
          </div>
          <div style={{ display: "flex", fontSize: 19, color: TEXT_FAINT }}>·</div>
          <div style={{ display: "flex", fontSize: 19, color: TEXT_DIM }}>{meta.nav}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Dot color={snap.live ? SAFE : WARN} size={10} />
          <div style={{ display: "flex", fontSize: 18, color: TEXT_SEC }}>{snap.live ? "Live" : "Delayed"}</div>
          {snap.live && snap.lagSeconds != null ? (
            <div style={{ display: "flex", fontFamily: MONO, fontWeight: 500, fontSize: 16, color: TEXT_FAINT }}>
              · Lag {snap.lagSeconds}s
            </div>
          ) : null}
        </div>
      </div>

      {/* body: identity + verdict | chart */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
            padding: "40px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", fontFamily: SANS, fontWeight: 600, fontSize: 62, letterSpacing: -2, lineHeight: 1.0, color: TEXT }}>
              {meta.title}
            </div>
            <div style={{ display: "flex", fontFamily: SANS, fontSize: 21, lineHeight: 1.35, color: TEXT_SEC, maxWidth: 440 }}>
              {c.tagline}
            </div>
          </div>

          {/* value-led verdict (the route's instrument) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontFamily: SANS, fontSize: 15, color: TEXT_DIM }}>{c.verdict.label}</div>
            <div
              style={{
                display: "flex",
                fontFamily: c.verdict.mono ? MONO : SANS,
                fontWeight: 600,
                fontSize: 46,
                letterSpacing: -1,
                color: toneColor(c.verdict.tone),
              }}
            >
              {c.verdict.value}
            </div>
            <div style={{ display: "flex", fontFamily: SANS, fontSize: 15, color: TEXT_FAINT }}>{c.verdict.sub}</div>
          </div>
        </div>

        {/* chart panel */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1.12, minWidth: 0, background: PANEL, borderLeft: `1px solid ${HAIRLINE}` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 38,
              padding: "0 22px",
              borderBottom: `1px solid ${HAIRLINE}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ display: "flex", fontFamily: SANS, fontWeight: 600, fontSize: 15, color: TEXT_SEC }}>{c.chartTitle}</div>
              <div style={{ display: "flex", fontFamily: SANS, fontSize: 13, color: TEXT_FAINT }}>{c.chartCode}</div>
            </div>
            {c.headerPill ? <Pill tone={c.headerPill.tone}>{c.headerPill.text}</Pill> : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: "14px 18px" }}>
            <Chart kind={c.chart} snap={snap} w={598} h={372} />
          </div>
        </div>
      </div>

      {/* tile strip */}
      <div style={{ display: "flex", alignItems: "center", height: 92, borderTop: `1px solid ${HAIRLINE}` }}>
        {c.tiles.map((t, i) => (
          <Tile key={t.label} label={t.label} value={t.value} color={t.color} first={i === 0} />
        ))}
      </div>

      {/* status bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 40,
          padding: "0 40px",
          borderTop: `1px solid ${HAIRLINE}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Dot color={snap.live ? SAFE : TEXT_FAINT} />
          <div style={{ display: "flex", fontFamily: MONO, fontWeight: 500, fontSize: 14, color: TEXT_FAINT }}>
            {statusBits.join("  ·  ")}
          </div>
        </div>
        <div style={{ display: "flex", fontFamily: MONO, fontSize: 14, color: TEXT_FAINT }}>
          deepskew.xyz  ·  DeepBook Predict
        </div>
      </div>
    </div>
  );
}

/** Build the OG/Twitter image for a route. Used by every opengraph-image.tsx.
 *  Satori only emits PNG, so the rendered bitmap is re-encoded to a compressed
 *  JPEG with sharp (mozjpeg, 4:4:4 chroma to keep the cerulean text/lines crisp).
 *  Runs only at build / hourly ISR regeneration, so the encode cost is paid once
 *  per hour per route. */
export async function renderRouteCard(route: OgRouteKey): Promise<Response> {
  const [snap, [regular, semibold, mono]] = await Promise.all([loadOgSnapshot(), fonts]);
  const png = await new ImageResponse(<Card route={route} snap={snap} />, {
    ...ogSize,
    fonts: [
      { name: SANS, data: regular, weight: 400, style: "normal" },
      { name: SANS, data: semibold, weight: 600, style: "normal" },
      { name: MONO, data: mono, weight: 500, style: "normal" },
    ],
  }).arrayBuffer();

  const jpeg = await sharp(Buffer.from(png))
    .flatten({ background: "#000000" })
    .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: { "content-type": ogContentType },
  });
}
