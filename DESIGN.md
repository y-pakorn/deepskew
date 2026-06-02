# DEEPSKEW — Design System

> **Midnight terminal.** A dark, information-dense quant terminal for DeepBook
> Predict. Precision and density, but calm. Every panel leads with a verdict; data
> supports it. This file is the source of truth and **must always match the tokens
> in `src/app/globals.css`** — if they drift, fix the doc.

---

## 1. North star & references

**Feeling:** an institutional research desk at midnight — focused, precise, quietly
premium. Density without clutter; depth from layered darkness, not decoration.

Grounded in research (not generic taste). **Tatem owns the visual language** (color,
type, restraint); the others contribute density and layout patterns:

| Reference | What we take |
|---|---|
| **Tatem** ("Midnight Terminal") — *primary* | `#000` canvas, `#161616` panel, **cerulean `#007eed` for data + interaction**, status colors carry risk. Inter, sentence case, **value-contrast hierarchy** (the answer is the brightest/biggest, not the most colorful). Restraint. |
| **Kraken Pro** | Zero dead space: tight ~20px label→value rows, dense tables, tabbed panels, footer status bar. |
| **Mercury** | Reading order: headline metric → supporting charts → dense table; filter-chip toolbars; prominent ⌘K. |
| **OpenSea / Axiom** | Subtle inset hairline borders; tonal-separation depth (no heavy shadows); rigid precise cards, generous internal padding; monochrome line icons. |
| **Fey** | Layered near-black surfaces for depth + compact pill tags (structure only — **not** its accent palette). |

**Five rules that keep dense from cluttered**
1. One verdict + quiet supporting data per panel. Big answer; the rest whispers.
2. Depth from layered surfaces + 1px hairline borders, never heavy shadows.
3. Color is information. Roles are fixed (§3.3); never decorative.
4. Tabular numerals, right-aligned value columns. Alignment is the whole game.
5. Keep one hero — the 3-D vol surface stays visually dominant.

---

## 2. Foundations — implementation

- Stack: Next 16 + Tailwind v4 (CSS-first `@theme`) + shadcn/ui. Tokens live in
  `src/app/globals.css`; shadcn semantic tokens are aliased onto our primitives.
- Dark only (`<html class="dark">`).
- All tokens are CSS custom properties; Tailwind utilities are generated via `@theme inline`.
- **Body base `font-size: 0.8125rem` (13px).** Any unclassed text settles at terminal-13px,
  never the browser's 16px default; the scale tokens (§4) layer on top.

---

## 3. Color

### 3.1 Surfaces — depth via tonal steps (not shadows)

| Token | Value | Role |
|---|---|---|
| `--canvas` | `#000000` | Page background, the void behind panels. |
| `--panel` | `#161616` | Panel / card base (locked). |
| `--panel-elev` | `#1e1e1e` | Elevated surface — consistent with panel: chips, hover, inner blocks, popovers, table-row hover. |
| `--hairline` | `#232323` | 1px borders + dividers (subtle). Inset borders give cards their edge. |
| `--divider` | `#3b3b3b` | Stronger divider where a section break must read. |

Depth is read from `canvas → panel → panel-elev` tonal steps plus hairline borders.
Never use drop shadows for elevation.

### 3.2 Text hierarchy

| Token | Value | Role |
|---|---|---|
| `--text` | `#ffffff` | Polar White — primary text + **key/hero values**. |
| `--text-sec` | `#b5b5b5` | Silver Tone — secondary text, panel titles, active labels. |
| `--text-dim` | `#919191` | Pewter Mist — data labels (the workhorse), captions, icon strokes. |
| `--text-faint` | `#606060` | Obsidian Grey — tertiary: axis ticks, footnotes, decorative. |

Hierarchy comes from **size + weight + which grey** — never from uppercase shouting,
never from hue. The headline value leads because it is the **brightest and biggest**.

### 3.3 Accent & semantic roles (fixed — do not repurpose)

| Token | Value | Role — use ONLY for |
|---|---|---|
| `--accent-brand` | `#007eed` cerulean | **Data + interaction.** Links, focus rings, slider fills, selected/active states, the live dot, chart/sparkline series, and reference markers (e.g. the ATM column). |
| `--safe` (= `--up`) | `#34d399` emerald | Positive / up bets / safe verdicts / gains. |
| `--breach` (= `--down`) | `#f43f5e` red | Negative / down bets / breach / losses. |
| `--warn` | `#fbbf24` amber | Elevated risk / caution / replay state. |

There is **no key-highlight color.** A "key value" (spot, ATM IV, the headline metric)
is rendered in **white `--text` at large size + weight 500–600** — it leads by contrast,
not by hue. Everything else is monochrome grey. If a color has no informational role
here, omit it.

### 3.4 Surface heat ramp (the one place color runs free)

The 3-D IV surface uses a spectral energy ramp encoding IV magnitude:
`#4f46e5` indigo → `#06b6d4` cyan → `#34d399` green → `#fbbf24` amber.
Confined to the surface mesh + its legend only.

---

## 4. Typography

- **Font:** Inter, everywhere (no monospace). Numbers use **`font-variant-numeric: tabular-nums`**
  (the `.tabular` class) for column alignment — this is why a mono font is unnecessary.
- **Weights:** `400` (data/body), `500` (labels, secondary headings, key values, buttons),
  `600` (panel heroes, the single biggest number). Weight is used **systematically**, never ad hoc.
- **Letter-spacing:** `-0.011em` base; tighter on hero/large numbers.

### Type scale (Tailwind utilities via `@theme`)

One size per role. **Never** mix ad-hoc Tailwind sizes (`text-sm`, `text-[14px]`) into the desk.

| Utility | Size / line-height | Role |
|---|---|---|
| `text-micro` | 10 / 1.3 | footer status bar, ticker sub-labels, axis ticks |
| `text-label` (`.label-micro`) | 11 / 1.3 | data labels, section labels |
| `text-data` | 12 / 1.35 | dense table cells, pills/chips, panel titles |
| `text-val` | 13 / 1.35 | **standard values + body base** |
| `text-md` | 15 / 1.3 | verdict text, emphasized values |
| `text-lead` | 20 / 1.2 | sub-hero values |
| `text-hero` | 28 / 1.05 | the hero number (spot) |

Labels are **lowercase / sentence case** (calm). Only acronyms stay caps (ATM, IV, SVI, PLP, UP/DN).

---

## 5. Spacing — strict 4px grid

Use only multiples of 4 (with 2px allowed for tight label/value pairs).

| Token | px | Use |
|---|---|---|
| `space-1` | 4 | row vertical padding, tight gaps |
| `space-2` | 8 | element gap, intra-section |
| `space-3` | 12 | panel padding, section gap |
| `space-4` | 16 | major section gap |
| `space-5` | 20 | panel-to-panel rhythm where needed |

- Panel body padding: **12px**. Dense table rows: **~4px** vertical. Section gap inside a panel: **12px**, divided by a hairline.
- The desk grid uses **1px** gaps (`gap-px` on a hairline background) so panels tile like a Bloomberg desk.

---

## 6. Radius, borders, elevation

`--radius: 0.375rem` (6px — Tatem default). Scale: `sm` 4 · `md` 6 · `lg` 8 · `xl` 12.

| Element | Radius |
|---|---|
| Panel / card | 8px (`rounded-lg`) |
| Inner block / verdict | 6px (`rounded-md`) |
| Button / input | 6px |
| Pill / chip / status dot | 999px (full) |

- **Borders:** 1px `--hairline`, used as inset card edges and row/section dividers.
- **Elevation:** tonal only (surface step up). **No drop shadows.**

---

## 7. Components

All terminal components compose from these primitives. Keep them consistent.

- **Panel** — `--panel` surface, 1px hairline border, radius 8. Header (h-8): `panel-title`
  (sentence case, `--text-sec`, weight 500) + optional `code` (faint) + right slot for status pills.
  Body padding 12.
- **Stat row** — `label` (`.label-micro`, `--text-dim`) ↔ `value` (`text-val`, tabular, tone). py 4 (tight).
  Tone `key` = white `--text` + weight 500 (the brightest value), **not** a hue.
- **Verdict** — status dot (tone) + tone-colored statement (`text-md`, weight 500) + sub label. Plain hairline border, `--panel-elev` tint.
- **Pill** — compact capsule tag (`text-data`, weight 500, px 8, 999 radius). Variants: `neutral` (elevated bg, dim text),
  `up` (emerald), `down` (red), `warn` (amber), `accent`/`key` (cerulean). For statuses: live, up/dn, arb-free, active, settled.
- **Meter** — ~1px bar, track `--panel-elev`, fill tone (cerulean for neutral gauges). Utilization/risk gauges.
- **Table** — dense: column-header row (`.label-micro`, dim, hairline-bottom), body rows ~24px,
  tabular values, hover row → `--panel-elev`, status via tone + pills. The Desk tape uses this.
- **Ticker strip** — thin horizontal bar of headline market stats (`.label-micro` label + `text-val` tabular value;
  key values white + weight 500), separated by spacing. Sits under the command bar for at-a-glance density.
- **Status bar (footer)** — thin bottom bar: indexer lag, checkpoint, network, links. `text-micro`, `--text-faint`.
- **Command bar (top)** — brand wordmark (weight 600) + market selector (ghost) + ⌘K + live pill + UTC clock + Connect.
- **Buttons** — *ghost*: transparent + 1px hairline, `--text-sec`, hover lifts to `--panel-elev`.
  *filled*: `--accent-brand` (cerulean) bg, weight 500. No shadows. Pills 999 for chips, 6px for actions.
- **Charts** — lightweight-charts for time series (themed transparent, hover crosshair + floating tooltip);
  hand-rolled SVG for smile cross-section (hover crosshair + IV readout), sparklines (cerulean), strike histogram.

---

## 8. Motion

- Surface auto-rotates on idle (slow), orbits on drag; **pulses cerulean ~600ms** on each oracle tick — the soul.
- **Values flash on update:** green (`--safe`) on an up-tick, red (`--breach`) on a down-tick, decaying ~600ms
  back to their own color. Numbers never jump jarringly.
- Panel entrance: fade-in ~300ms. Transitions 150–200ms ease-out. Never bouncy.

---

## 9. Layout — the desk (single viewport)

```
┌ command bar ── DEEPSKEW · BTC ▾ ───── ⌘K ──── ● live·lag · UTC · Connect ┐
├ ticker strip · spot · ATM IV · 24h vol · OI · taker-win · PLP · arb ✓ ────┤
├──────────────────────────┬───────────────┬──────────────────────────────┤
│ IV SURFACE (3-D hero)    │ SMILE / SKEW  │ ORACLE STATE                 │
│  + tenor strip + arb     │  chart + OI   │  spot(hero) + vol matrix     │
│  + heat legend           │  + readouts   │  + term structure + SVI      │
├──────────────────────────┴───────┬───────┴──────────────────────────────┤
│ VAULT · PLP RISK                  │ DESK · flow · settle                 │
│  ±5σ + ladder | perf+LP | gauges  │  positioning + settlement + tape     │
└ status bar ── indexer · checkpoint · network · links ─────────────────────┘
```

Density rules: tight rows, tabs over voids, pills for statuses, tabular right-aligned values,
one hero per panel, the surface dominant.

---

## 10. Iconography

`lucide-react`, monochrome (`--text-dim`/`--text-sec`), 1.5px stroke, size 14–16. Icons support
labels; never decorative-only.

---

## 11. Do / Don't

**Do:** layer surfaces for depth · reserve color roles · tabular numerals · one verdict per panel ·
pack rows tightly · pills for status · weight scale 400/500/600 · sentence case · key value = brightest white, not a hue.

**Don't:** drop shadows · uppercase shouting on data · monospace font · decorative color · color a "key" value
(it leads by size + weight + white) · mixed ad-hoc font sizes/weights/spacing · mid-panel voids · averaging references into a safe middle.

---

## 12. Accessibility

- Body/value text ≥ 11px; primary values white on near-black (high contrast). Dim labels are
  non-essential context, paired with bright values.
- Color is never the *only* signal — pair up/down color with ▲/▼ glyphs and labels.
- Focus rings use `--accent-brand` (cerulean). Interactive targets ≥ 24px hit area.
