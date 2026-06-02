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
| `--text-sec` | `#c4c4c4` | secondary text, panel titles, active labels. |
| `--text-dim` | `#a8a8a8` | data labels (the workhorse), captions. |
| `--text-faint` | `#8a8a8a` | tertiary floor — footer, axis ticks. **Never go below this for readable text** (`#606060` is a disabled-tier swatch, fails contrast on near-black). |

Hierarchy comes from **size + weight + which grey** — never from uppercase shouting,
never from hue. The headline value leads because it is the **brightest and biggest**.
Readability floor: **12px** for any real text; lift the gray, don't shrink the type.

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

- **Font:** **Inter** for UI + labels; **JetBrains Mono (tabular)** for every number, value,
  price, address, and SVI param. The `.tabular` class sets the mono family + `tabular-nums` — the
  mono texture is the "machine data" signal that makes a readout read as data, not prose.
- **De-emphasized affix** (`MonoValue` / `.affix`): a value's leading currency symbol and trailing
  unit/scale/exponent (`$`, `%`, `M`, `e-6`) render dim + `0.82em` so the magnitude leads.
- **Weights:** `400`/`500`/`600` only — **never 700+** on near-black (it blooms/muddies). 500 =
  labels + inline values; 600 = tile/lead/hero numbers. Hierarchy is size + weight + brightness.
- **Letter-spacing:** `0` for labels and mono values; `-0.02em` (`tracking-tight`) on hero/tile numbers.

### Type scale (Tailwind utilities via `@theme`) — 12px floor

One size per role. **Never** mix ad-hoc Tailwind sizes (`text-sm`, `text-[14px]`) into the desk.

| Utility | Size / line-height | Role |
|---|---|---|
| `text-micro` | 12 / 1.4 | footer status bar, axis ticks (the floor — nothing smaller) |
| `text-label` (`.label-micro`) | 12 / 1.4 · w500 | labels, section labels (`--text-dim` #a8a8a8) |
| `text-data` | 12 / 1.35 | pills/badges, dense table cells, inline annotations |
| `text-val` | 15 / 1.35 | standard ledger values |
| `text-md` | 18 / 1.25 | tile values |
| `text-lead` | 24 / 1.15 | sub-hero |
| `text-hero` | 32 / 1.05 | the one hero number (spot) |
| `.panel-title` | 13 · w500 | panel header |

Body base = **14px** (unclassed text never falls to the 16px UA default).

**Size by structure, not role alone:**
- **Label-led rows** (a label + value share a line — Stat ledger, ticker, section-header
  annotations): the value reads ~12–15px so it *correlates* with its 12px label; it leads by
  mono + brightness + weight, not a big size jump.
- **Value-led stacked** (a tiny caption *above* a number — StatTile 18, vol matrix, hero 32): the
  value is intentionally much larger; the stacked structure makes the jump read as one unit.

**Casing = Sentence case.** Stat/section/pill/prose labels capitalize the first word only
("Forward", "Expiry", "Vault value", "Active", "Arb-free"). Domain abbreviations & tickers stay
canonical (ATM, IV, SVI, PLP, LP, OI, BTC, USD, MtM, RR, UTC, APY, 24h); math symbols (`a b m ρ σ`)
and number-led labels stay as-is. **No forced lowercase, no shouty all-caps** — UPPERCASE is reserved
only for a rare tracked micro-eyebrow above a hero number.

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
- **MonoValue** — the numeric renderer: JetBrains Mono tabular, splitting off the leading currency
  + trailing unit/exponent into a dim `.affix` so the magnitude leads. Only splits when the core is a
  real number (addresses/durations render whole + bright). Every value flows through it (via Stat/StatTile).
- **Stat row** (label-led) — `label` (`.label-micro`, `--text-dim`) ↔ mono `value` (`text-val`,
  right-aligned into a decimal column). Use in a 2-up grid so the gutter reads as alignment, not void.
  `focal` tints the one value the panel is verdicting (cerulean). Tone `key` = white, not a hue.
- **StatTile + TileGrid** (value-led) — the void-killer for headline clusters: a tiny `.label-micro`
  on top, mono value (`text-md`, 18) directly below, left-aligned; tiles sit in a hairline-divided
  `TileGrid` (1px gaps as dividers). No horizontal label↔value pairing, so no center void.
- **Verdict** — status dot (tone) + tone statement (`text-val`, 15, weight 500) + sub label. Plain hairline border, `--panel-elev` tint.
- **Pill / badge** — compact capsule tag, **Inter** (not mono — these are status *words*), 12px, weight 500,
  px 8, 999 radius, Sentence case. Variants: `neutral` (elevated bg, dim text), `up` (emerald),
  `down` (red), `warn` (amber), `accent`/`key` (cerulean). Statuses: Live, Up/Dn, Arb-free, Active, Settled.
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

**Do:** layer surfaces for depth · reserve color roles · JetBrains Mono tabular for every number ·
Inter for labels/pills · de-emphasize units/affixes · one verdict per panel · pack rows tightly ·
pills for status · weight scale 400/500/600 · Sentence case · key value = brightest white, not a hue.

**Don't:** drop shadows · forced lowercase OR all-caps labels · Inter for numbers / mono for word-pills ·
text below 12px or grays below `#8a8a8a` for readable text · decorative color · color a "key" value
(it leads by size + weight + white) · ad-hoc font sizes/weights/spacing · mid-panel voids · averaging references into a safe middle.

---

## 12. Accessibility

- All readable text ≥ 12px; secondary grays ≥ `#8a8a8a` on near-black. Primary values are white
  (high contrast); dim labels are paired context, not lone information.
- Color is never the *only* signal — pair up/down color with ▲/▼ glyphs and labels.
- Focus rings use `--accent-brand` (cerulean). Interactive targets ≥ 24px hit area.
