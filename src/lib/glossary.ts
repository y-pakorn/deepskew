// Tooltip glossary for every key-value in the terminal. Hand-checked against
// PLAN.md + lib/svi.ts. Keyed by a stable id; LabelTip renders the entry via
// <TipContent>: a title + one-line plain-English body, plus an optional typeset
// equation (KaTeX/LaTeX) and precise detail bullets. Use inline $…$ for small
// math in any string. A bare string is rendered as a plain description.

/** A structured tooltip definition. */
export interface TipDoc {
  /** Term name, optionally with its symbol, e.g. "Correlation — $\\rho$". */
  title: string;
  /** One tight, plain-English sentence: what it is + why it matters. */
  body: string;
  /** Optional block equation in LaTeX (rendered with KaTeX). */
  math?: string;
  /** Precise details: range, source field, formatting, color rules, … */
  points?: string[];
}

export type TipEntry = TipDoc | string;

export const GLOSSARY: Record<string, TipEntry> = {
  // — IV surface —
  "arb-free": {
    title: "Arbitrage-free",
    body: "The vol shape leaves no risk-free money on the table — green only when every no-arbitrage check passes.",
    points: [
      "Calendar: total variance non-decreasing in $T$.",
      "Butterfly: Durrleman $g(k)\\ge 0$ across the $k$-grid.",
      "Green when both hold; otherwise flagged.",
    ],
  },
  "atm-term-overlay": {
    title: "ATM term structure",
    body: "At-the-money implied vol at the nearest expiry vs the farthest — the term-structure of ATM vol.",
    points: [
      "$\\text{frontIV}=\\text{rows}[0].\\text{atmIV}$, $\\text{backIV}=\\text{rows}[\\text{last}].\\text{atmIV}$.",
      "Arrow reads near→far, rendered as integer %.",
    ],
  },
  "butterfly-arb": {
    title: "Butterfly arbitrage",
    body: "A smile shaped so a butterfly spread would cost less than nothing — an impossible negative implied density.",
    math: "g(k)=\\Big(1-\\tfrac{k\\,w'}{2w}\\Big)^2-\\tfrac{w'^2}{4}\\Big(\\tfrac1w+\\tfrac14\\Big)+\\tfrac{w''}{2}",
    points: [
      "Arb-free when Durrleman $g(k)\\ge 0$ across the strike grid.",
      "Flagged red the moment $g(k)<0$ at any sampled $k$.",
    ],
  },
  "calendar-arb": {
    title: "Calendar arbitrage",
    body: "Total variance must never fall as expiry lengthens. ✕ means a longer-dated tenor is priced cheaper (in variance) than a nearer one at the same strike — free money on the table.",
    math: "w_{T_2}(k)\\ge w_{T_1}(k)\\quad (T_2>T_1)",
    points: [
      "The pill flips red the moment this is violated for any sampled $k$.",
      "Checked across the live term structure by `checkCalendar`.",
    ],
  },
  "iv-heat-legend": {
    title: "IV color key",
    body: "The surface's color encodes implied vol — dark blue is the lowest vol on screen, bright cyan/white the highest.",
    points: [
      "Ramp maps normalized IV in $[0,1]$ across the current surface.",
      "Relative scale, not an absolute vol scale.",
    ],
  },
  "iv-surface-panel": {
    title: "IV surface",
    body: "A 3-D map of how BTC option-implied volatility varies by strike and time-to-expiry — per-expiry SVI smiles stacked into a $(k,T)\\!\\to\\!\\text{IV}$ surface.",
    math: "\\text{IV}(k)=\\sqrt{w(k)/T},\\quad w(k)=a+b\\big(\\rho(k-m)+\\sqrt{(k-m)^2+\\sigma^2}\\big)",
  },
  "moneyness-readout": {
    title: "Moneyness readout",
    body: "How far the cursor's strike sits above ($+$) or below ($-$) the forward, in percent.",
    math: "(e^{k}-1)\\times 100",
    points: [
      "$k$ is log-moneyness; $k=0$ is at-the-money.",
      "Ticks labeled ±10/20% are log-moneyness, so $\\pm0.2\\approx-18\\%..+22\\%$ actual.",
    ],
  },
  "surface-iv-readout": {
    title: "Surface IV readout",
    body: "Implied volatility at the point under your cursor — the headline value, an annualized vol fraction.",
    math: "\\text{iv}=\\min\\big(\\sqrt{w/T},\\,1.0\\big)",
    points: [
      "Evaluated at the snapped real tenor; shown ×100 to 1 dp.",
    ],
  },
  "svi-model": {
    title: "SVI model",
    body: "The Stochastic-Volatility-Inspired model (Gatheral & Jacquier 2014) that fits the whole vol smile with just five numbers.",
    math: "w(k)=a+b\\big(\\rho(k-m)+\\sqrt{(k-m)^2+\\sigma^2}\\big)",
    points: [
      "Parameterizes total variance vs log-moneyness $k$.",
    ],
  },
  "real-vs-interp-ribs": {
    title: "Real vs interpolated ribs",
    body: "Bright grid lines are real on-chain expiries; dimmer lines are smooth fill between them.",
    points: [
      "Interp ribs multiply color by $0.42$.",
      "Built in total-variance space (linear in $T$) to stay calendar-arb-free.",
    ],
  },
  "strike-axis-hint": {
    title: "Strike axis",
    body: "Moving right raises the option strike across the surface.",
    points: [
      "Columns span log-moneyness $k=-0.2..0.2$ ($\\approx-18\\%$ to $+22\\%$ of forward).",
      "No numeric strike ticks are drawn.",
    ],
  },
  "surface-height": {
    title: "Surface height",
    body: "How tall a point rises encodes relatively higher IV on this surface.",
    math: "y=\\text{norm}\\cdot Y_{\\text{SCALE}},\\quad \\text{norm}=\\tfrac{\\text{iv}-\\text{ivMin}}{\\text{span}}",
    points: [
      "Normalized across the whole surface to fill the frame.",
      "Not an absolute IV height.",
    ],
  },
  "tenor-countdown": {
    title: "Tenor countdown",
    body: "A live countdown to an expiry along the surface depth.",
    math: "\\text{fmtDuration}(\\text{expiry}-\\text{now})",
    points: [
      "Formats $Dd\\,Hh$ / $Hh\\,MMm$ / $Mm\\,SSs$ / $Ss$, or 'expired' if $\\le 0$.",
      "Nearest tenor highlighted cerulean; hovered tenor underlined.",
    ],
  },
  "tick-pulse": {
    title: "Tick pulse",
    body: "The wireframe briefly brightens when a fresh on-chain SVI update arrives, signaling the desk is live.",
    points: [
      "On version change (checksum of SVI data), wire opacity ramps $0.8\\to0.5$ over 700 ms.",
    ],
  },
  "drag-to-orbit": {
    title: "Drag to orbit",
    body: "Drag to rotate the camera around the surface.",
    points: [
      "Camera-only orbit, damped; no pan or zoom.",
      "Polar angle clamped; auto-rotates while not hovering.",
    ],
  },
  "n-tenors": {
    title: "Tenor count",
    body: "How many distinct real on-chain expiries are stacked into the surface right now.",
    points: [
      "Count of active oracle tenors with valid SVI and $T>0$.",
      "Interpolated fill-ribs between them are not counted.",
    ],
  },
  "surface-resolving": {
    title: "Surface resolving",
    body: "The surface is still loading and not yet drawable.",
    points: [
      "Shown until at least two expiries have data.",
      "buildSurface needs $\\ge 2$ tenors to render a surface.",
    ],
  },
  "tenor-axis": {
    title: "Tenor axis",
    body: "The time-to-expiry axis running along the surface's depth.",
    points: [
      "Each entry is the live countdown to one real oracle expiry.",
      "Nearest tenor sits closest to the camera; structure recedes as $T$ grows.",
    ],
  },
  // — Smile / skew —
  "atm-iv": {
    title: "ATM implied volatility",
    body: "The market's expected annualized BTC swing — the single most-watched vol number. Also sizes the vault's stress shock.",
    math: "\\sigma_{\\text{IV}}(0)=\\sqrt{w(0)/T}",
    points: [
      "Evaluated at-the-money ($k=0$); live BTC ≈ 42–45%.",
    ],
  },
  "call-wing": {
    title: "Call wing",
    body: "Implied vol 10% above the forward (the upside/call wing) — how expensive upside bets are.",
    math: "\\text{IV}(+0.1)=\\sqrt{w(0.1)/T}",
    points: [
      "$\\operatorname{impliedVol}(+0.1,p,T)\\times100$; strike ≈ 10% over forward.",
      "Shown to 1 dp.",
    ],
  },
  "fly": {
    title: "Butterfly — fly",
    body: "How much the wings curve up versus the at-the-money point — a measure of smile convexity.",
    math: "\\text{fly}=\\tfrac{\\text{put}+\\text{call}}{2}-\\text{atm}",
    points: [
      "In IV points; positive = wings richer than ATM.",
      "fmtSigned, 1 dp.",
    ],
  },
  "put-wing": {
    title: "Put wing",
    body: "Implied vol 10% below the forward (the downside/put wing) — how expensive crash protection is.",
    math: "\\text{IV}(-0.1)=\\sqrt{w(-0.1)/T}",
    points: [
      "$\\operatorname{impliedVol}(-0.1,p,T)\\times100$; strike ≈ 10% under forward.",
      "Shown to 1 dp.",
    ],
  },
  "skew-rr": {
    title: "Risk reversal — skew",
    body: "How much pricier downside is than upside — put minus call IV at ±10% moneyness, the headline crash-fear gauge.",
    math: "\\text{RR}=\\text{IV}(-0.1)-\\text{IV}(+0.1)",
    points: [
      "Negative = market paying up for puts (put skew, normal for BTC).",
      "fmtSigned, 1 dp; warn tone when $<0$.",
    ],
  },
  "histogram-axis": {
    title: "OI chart x-axis",
    body: "Strike distance below spot on the left, ATM at center, strike distance above on the right — so OI lines up with the smile.",
    math: "\\text{reach}=\\max\\big(0.005,\\;\\max|\\text{mny}|\\big)\\times1.25",
    points: [
      "Span is symmetric and adaptive so near-ATM strikes stay legible.",
    ],
  },
  "histogram-hover": {
    title: "OI bar hover",
    body: "Hovering an open-interest bar reveals that strike's price, its distance from spot, and the Up versus Dn position counts.",
    points: [
      "$\\operatorname{fmtPrice}(\\text{strike})$, then signed $\\operatorname{fmtMny}(\\text{strike}/\\text{spot}-1)$.",
      "Raw up / dn position counts shown after.",
    ],
  },
  "live-replay": {
    title: "Live / Replay",
    body: "Live is the newest on-chain smile; Replay is a scrubbed past snapshot stamped with its UTC capture time.",
    points: [
      "Replay pill (warn tone) shows $\\operatorname{utcClock}(\\text{checkpoint\\_timestamp\\_ms})$.",
      "Appears only when you scrub back in history.",
    ],
  },
  "oi-by-strike": {
    title: "Open interest by strike",
    body: "How many live binary positions sit at each strike, grouped and aligned under the smile.",
    points: [
      "PositionMinted grouped by strike, filtered to $|\\text{strike}/\\text{spot}-1|\\le0.5$.",
      "Bar height = up + dn count per strike.",
    ],
  },
  "smile-hover": {
    title: "Smile hover",
    body: "Hovering the smile reads off the implied vol and moneyness right under the cursor.",
    points: [
      "$\\text{IV}\\times100$ to 1 dp in accent; signed $k\\times100$ in faint.",
      "Snaps to the nearest of 80 sampled points.",
    ],
  },
  "smile-panel": {
    title: "Vol smile",
    body: "One expiry's vol smile — how IV changes across strikes and whether it tilts toward puts or calls.",
    math: "\\text{IV}(k)=\\sqrt{w(k)/T},\\quad k=\\ln(K/F)",
    points: [
      "Plotted from the live SVI fit, with skew/fly readouts.",
    ],
  },
  "smile-x-ticks": {
    title: "Smile x-axis",
    body: "Deep-put edge at −30% moneyness on the left, ATM at center, deep-call edge at +30% on the right.",
    points: [
      "Endpoints are SMILE_OPTS $k_{\\min}/k_{\\max}=-0.3/+0.3$.",
      "Center strike = forward.",
    ],
  },
  "smile-y-tick": {
    title: "Smile y-axis top",
    body: "The top of the IV scale on the smile chart marks the highest vol shown.",
    math: "y_{\\text{top}}=(\\max(\\text{IV})+12\\%\\,\\text{pad})\\times100",
    points: [
      "Top-left label; only the high end is ticked, the low end has none.",
    ],
  },
  "time-travel": {
    title: "Time travel",
    body: "A scrubber that replays how this expiry's smile evolved over past SVI updates.",
    points: [
      "Slider $0\\ldots\\text{liveIdx}$ across the SVI history array.",
      "Shown only when $>1$ snapshot; pushing to liveIdx returns to live.",
    ],
  },
  "up-dn-legend": {
    title: "Up / Dn legend",
    body: "Color key for binary direction: green Up bets the price ends above strike, red Dn bets it ends below.",
    math: "\\text{upFrac}=\\tfrac{\\text{up}}{\\text{up}+\\text{dn}}",
    points: [
      "In the OI histogram each bar is a stacked green-over-red split.",
    ],
  },
  "jump-to-live": {
    title: "Jump to live",
    body: "Resets the replay scrubber back to the newest live smile.",
    points: [
      "Faint 'Live' when already live; accent '→ Jump to live' when scrubbed back.",
      "Sets scrub = null.",
    ],
  },
  "smile-states": {
    title: "Smile status states",
    body: "Status messages when there's no live curve — no oracle selected, the feed failed, or this expiry already settled.",
    points: [
      "Settled when $\\text{status}=\\text{settled}$ or $T\\le0$.",
      "Settled still shows the arb verdict on the last fitted params.",
    ],
  },
  // — Oracle state (SVI params) —
  "atm-var": {
    title: "ATM total variance",
    body: "The raw un-annualized variance at-the-money that ATM IV is derived from – near-zero for short expiries.",
    math: "\\sigma_{\\text{ATM}}^2 T = w(0) = a + b\\big(\\rho(-m)+\\sqrt{m^2+\\sigma^2}\\big)",
    points: [
      "Source $\\text{atmVar}=\\text{totalVariance}(0,p)$; shown in $\\text{toExponential}(2)$.",
      "IV recovered as $\\sqrt{w(0)/T}$.",
    ],
  },
  "checkpoint": {
    title: "Checkpoint",
    body: "The Sui checkpoint – a block-height-like sequence number – this snapshot came from, its proof of freshness.",
    points: [
      "Roughly 9–11 digit monotonic ledger height.",
      "Shown with thousands separators.",
    ],
  },
  "expiry": {
    title: "Expiry",
    body: "Time left until this contract settles, or 'Settled' once it is done.",
    math: "\\sigma_{\\text{IV}}(k)=\\sqrt{w(k)/T}",
    points: [
      "From $\\text{fmtDuration}(\\text{expiry}-\\text{now})$; drives the time-to-expiry $T$.",
      "Renders 'expired' when $T\\le 0$.",
    ],
  },
  "forward": {
    title: "Forward — $F$",
    body: "The price the market expects BTC to have at this option's expiry – the reference the whole smile is centered on.",
    math: "k=\\ln(K/F)",
    points: [
      "Source $\\text{latest\\_price.forward}$, $1\\text{e}9$-scaled \\$.",
      "$F$ is the denominator of log-moneyness $k$.",
    ],
  },
  "oracle-panel": {
    title: "Oracle panel",
    body: "The live on-chain oracle: current price plus the five SVI numbers that define BTC's whole implied-vol smile.",
    points: [
      "Data from GET $\\text{/oracles/:id/state}$.",
      "Carries meta, $\\text{latest\\_price}$ and $\\text{latest\\_svi}$.",
    ],
  },
  "strike-matrix-ticks": {
    title: "Strike matrix ticks",
    body: "Strike positions as percent moneyness with ATM in the middle, so you can read each cell's distance from the forward.",
    math: "k=\\ln(K/F)",
    points: [
      "Labels read like $\\pm 10/20\\%$ but $k$ is log-moneyness.",
      "So $-0.2$ is really $\\approx -18\\%$ actual strike offset.",
    ],
  },
  "svi-a": {
    title: "SVI level — $a$",
    body: "The baseline floor of total variance that shifts the whole smile up or down.",
    math: "w(k)=\\textcolor{#4aa3ff}{a}+b\\big(\\rho\\,(k-m)+\\sqrt{(k-m)^2+\\sigma^2}\\big)",
    points: [
      "Decoded as on-chain $\\text{raw.}a/1\\text{e}9$.",
      "Shown $\\text{toExponential}(3)$, e.g. $2.767\\text{e}{-5}$.",
    ],
  },
  "svi-b": {
    title: "SVI slope — $b$",
    body: "How steep the smile's wings are – the angle between its two asymptotes.",
    math: "w(k)=a+\\textcolor{#4aa3ff}{b}\\big(\\rho\\,(k-m)+\\sqrt{(k-m)^2+\\sigma^2}\\big)",
    points: [
      "Raw-SVI $b\\ge 0$; decoded $\\text{raw.}b/1\\text{e}9$.",
      "Shown $\\text{toExponential}(3)$, e.g. $4.037\\text{e}{-4}$.",
    ],
  },
  "svi-m": {
    title: "SVI shift — $m$",
    body: "Horizontal position of the smile's low point relative to at-the-money.",
    math: "w(k)=a+b\\big(\\rho\\,(k-\\textcolor{#4aa3ff}{m})+\\sqrt{(k-\\textcolor{#4aa3ff}{m})^2+\\sigma^2}\\big)",
    points: [
      "Log-moneyness of the vertex shift; $w(k)$ centers on $(k-m)$.",
      "Source $(\\text{raw.}m/1\\text{e}9)\\cdot\\text{sign}$; shown $\\text{toFixed}(5)$.",
    ],
  },
  "svi-rho": {
    title: "Correlation — $\\rho$",
    body: "The smile's skew or tilt: how much richer downside (put) vol is than upside — the usual fear premium.",
    math: "w(k)=a+b\\big(\\textcolor{#4aa3ff}{\\rho}\\,(k-m)+\\sqrt{(k-m)^2+\\sigma^2}\\big)",
    points: [
      "Range $\\rho\\in[-1,1]$; more negative = steeper put skew.",
      "Live BTC $\\approx -0.94$; tinted warn when $\\rho<0$.",
    ],
  },
  "svi-sigma": {
    title: "SVI curvature — $\\sigma$",
    body: "How rounded vs sharp the bottom of the smile is – small is a sharp V, large a gentle bowl.",
    math: "w(k)=a+b\\big(\\rho\\,(k-m)+\\sqrt{(k-m)^2+\\textcolor{#4aa3ff}{\\sigma}^2}\\big)",
    points: [
      "Source $\\sigma>0=\\text{raw.}\\sigma/1\\text{e}9$; shown $\\text{toFixed}(5)$.",
      "Unrelated to the stress $\\sigma$.",
    ],
  },
  "term-structure": {
    title: "Term structure",
    body: "How ATM vol changes across expiries, showing an upward or inverted curve.",
    math: "\\sigma_{\\text{ATM}}(T)=\\sqrt{w(0)/T}",
    points: [
      "Readout = nearest $\\to$ farthest $\\text{atmIV}\\%$ over active oracles.",
      "Each $\\text{impliedVol}(0,\\text{params},T)\\times 100$; tenor labels are near/far countdowns.",
    ],
  },
  "feed-age": {
    title: "Feed age",
    body: "How long ago the oracle last updated – the panel's freshness verdict.",
    math: "\\text{age}=\\text{now}-\\text{checkpoint\\_ts}",
    points: [
      "Rendered compact: 's / m / h / d h' (a dead feed reads '4d 19h', not raw seconds).",
      "Green if $<120\\text{s}$, warn otherwise.",
    ],
  },
  "feed-expired": {
    title: "Expired, not settled",
    body: "This expiry has passed but the oracle isn't settled on-chain yet, so its price/SVI feed is frozen and the binary stays un-mintable until settlement clears it.",
    points: [
      "The label shows how long ago it expired.",
      "Drops out of the feed list once the oracle settles.",
    ],
  },
  "oracle-status": {
    title: "Oracle status",
    body: "Whether this expiry is still trading, has settled, or was just created.",
    points: [
      "Derived server-side from timestamps.",
      "$\\text{settled\\_at}\\to$ settled (neutral), $\\text{activated\\_at}\\to$ active (green), else created (warn).",
    ],
  },
  "vol-by-strike": {
    title: "Vol by strike",
    body: "A row of IV readings across strikes showing how vol rises out-of-the-money – the skew.",
    math: "\\text{IV}(k)=\\sqrt{w(k)/T}",
    points: [
      "Each cell = $\\text{impliedVol}(k,p,T)\\times 100$, integer %.",
      "Sampled at $k\\in[-0.2,-0.1,0,0.1,0.2]$.",
    ],
  },
  "oracle-id": {
    title: "Oracle ID",
    body: "The on-chain object ID of this oracle, shortened for explorer lookup.",
    points: [
      "$\\text{truncateAddr}(\\text{oracle\\_id},6,4)\\to$ '0x8263…d6cf'.",
      "One oracle = one rolling expiry.",
    ],
  },
  "spot": {
    title: "Spot",
    body: "Current BTC price the oracle reports – the headline number this panel verdicts on.",
    points: [
      "Source $\\text{latest\\_price.spot}$, $1\\text{e}9$-scaled.",
      "$\\text{fmtPrice}$ to '\\$69,315' (0 dp); per-digit pop on tick.",
    ],
  },
  "spot-sparkline": {
    title: "Spot sparkline",
    body: "Mini trend of recent spot prices with the % move over the window, green up and red down.",
    math: "\\Delta_{\\text{spot}}=\\frac{\\text{last}-\\text{first}}{\\text{first}}\\times 100",
    points: [
      "Over the spot-history samples.",
      "Shown $\\text{fmtSigned}$ to 2 dp.",
    ],
  },
  // — Vault —
  "apy": {
    title: "APY",
    body: "The vault's annualized LP return over its recorded history, projected to a full year — the headline yield for liquidity providers.",
    math: "\\text{APY}=\\frac{\\text{last}/\\text{first}-1}{\\text{years}}\\times 100",
    points: [
      "Share-price ratio over the perf window; simple, non-compounded.",
      "Green when positive; null with $<2$ data points.",
    ],
  },
  "available-liq": {
    title: "Available liquidity",
    body: "Free capital the vault can pay out or let LPs withdraw right now — funds not reserved against max payout, and the numerator of the stress buffer.",
    points: [
      "Source `data.available_liquidity`, scaled by $1e6$.",
    ],
  },
  "lp-net-flow": {
    title: "LP net flow",
    body: "Whether LPs are net depositing into or withdrawing from the vault, read off a running cumulative balance.",
    math: "\\text{net}=\\textstyle\\sum(\\text{supplies})-\\sum(\\text{withdrawals})",
    points: [
      "Source `/lp/*`; sparkline plots the cumulative series.",
      "Reads $N$ deposits, $M$ withdrawals, net dUSDC in.",
    ],
  },
  "max-payout": {
    title: "Max payout",
    body: "The largest total the vault could owe if every open position pays out fully — a hard liability ceiling, since Predict payouts are capped.",
    points: [
      "Source `data.total_max_payout`, scaled by $1e6$; warn tone.",
      "Denominator of max-payout util and the stress model.",
    ],
  },
  "max-payout-util": {
    title: "Max-payout utilization",
    body: "Tail-risk gauge: how close the worst-case total payout sits to exhausting the vault's capacity — the core LP-safety tail metric.",
    math: "\\text{util}=\\frac{\\text{total\\_max\\_payout}}{\\text{capacity}}",
    points: [
      "Range $0..1$, shown $\\times100$ to 2 dp; warn-tone meter.",
    ],
  },
  "modeled-payout": {
    title: "Modeled payout",
    body: "The dUSDC the vault is modeled to owe traders in the simulated crash — a heuristic stress estimate, not position-level pricing.",
    math: "\\text{payout}=\\text{maxPayout}\\cdot\\big(\\text{mtmFrac}+(1-\\text{mtmFrac})(1-e^{-\\sigma/2.5})\\big)",
    points: [
      "Payout fraction ramps toward the cap as $\\sigma$ grows.",
    ],
  },
  "plp-share-price": {
    title: "PLP share price",
    body: "What one PLP vault share is worth now — above \\$1.0000 means LPs are in profit.",
    math: "\\text{share}=\\frac{\\text{vault\\_value}}{\\text{plp\\_total\\_supply}}",
    points: [
      "Starts at $1.0$ at inception; header shows 4 dp.",
      "Perf chart plots its time series.",
    ],
  },
  "plp-supply": {
    title: "PLP supply",
    body: "Total PLP shares outstanding across all LPs — the denominator that turns vault value into a per-share price.",
    points: [
      "Source `data.plp_total_supply`, scaled by $1e6$.",
      "A share count, though rendered like a \\$ figure.",
    ],
  },
  "sigma-move": {
    title: "$\\sigma$ move",
    body: "How far BTC would drop in the simulated 1-day N-sigma crash — downside only.",
    math: "\\text{move}=\\sigma_{\\text{IV}}\\cdot\\sqrt{1/365.25}\\cdot\\sigma",
    points: [
      "Shown as $-(\\text{moveFrac}\\times100)$; warn tone.",
    ],
  },
  "stress-ladder": {
    title: "Stress ladder",
    body: "Table previewing crash size and coverage at fixed 1 / 2 / 3 / 5 sigma so you can read the whole tail at a glance.",
    math: "\\text{Buffer}=\\frac{\\text{availLiq}}{\\text{maxPayout}\\cdot\\text{payoutFrac}}",
    points: [
      "Move = modeled $-\\%$ drop per $\\sigma$ row.",
      "Color safe $\\ge2$, warn $\\ge1$, breach $<1$.",
    ],
  },
  "stress-sigma": {
    title: "Stress $\\sigma$",
    body: "Number of standard deviations in the modeled 1-day BTC move — bigger means rarer and more extreme.",
    math: "\\text{moveFrac}=\\sigma_{\\text{IV}}\\cdot\\sqrt{1/365.25}\\cdot\\sigma",
    points: [
      "Unrelated to the SVI $\\sigma$ curvature param.",
    ],
  },
  "stress-verdict": {
    title: "Stress verdict",
    body: "The flagship LP-safety headline: would the vault survive an N-sigma 1-day crash?",
    math: "\\text{buffer}=\\frac{\\text{availLiq}}{\\text{stressedPayout}}",
    points: [
      "Reads 'Survives N$\\sigma$ · $X\\times$ buffer' (safe $\\ge2$, warn $\\ge1$).",
      "'Breach' when buffer $<1$.",
    ],
  },
  "stressed-spot": {
    title: "Stressed spot",
    body: "Where BTC's price would land after the simulated crash.",
    math: "\\text{stressedSpot}=\\text{spot}\\cdot(1-\\text{moveFrac})",
    points: [
      "Scaled by $1e9$, 0 dp; shown only when spot is known.",
    ],
  },
  "total-mtm": {
    title: "Total mark-to-market",
    body: "The current net value of all open positions the vault holds against traders — what it would book if it closed everything now.",
    math: "\\text{mtmFrac}=\\operatorname{clamp}\\big(\\text{mtm}/\\text{maxPayout},\\,0,\\,1\\big)",
    points: [
      "Source `data.total_mtm`, scaled by $1e6$; feeds the stress model.",
    ],
  },
  "utilization": {
    title: "Utilization",
    body: "How much of the vault's capital is currently tied up backing open positions.",
    points: [
      "Source `data.utilization`, a $0..1$ fraction shown $\\times100$ to 2 dp.",
      "Meter fills value $\\times100\\%$.",
    ],
  },
  "vault-value": {
    title: "Vault value",
    body: "Total mark-to-market worth of the vault's assets right now — distinct from raw cash `vault_balance`.",
    points: [
      "Source `data.vault_value`: quote balance adjusted for open-position MtM.",
      "Scaled by $1e6$, fmtUsdCompact e.g. \\$1.01M.",
    ],
  },
  "dusdc": {
    title: "dUSDC",
    body: "Predict's Testnet-only quote stablecoin — not official Testnet USDC — in which every vault USD figure is denominated.",
    points: [
      "All vault amounts are dUSDC scaled by $1e6$.",
    ],
  },
  "net-deposits": {
    title: "Net deposits",
    body: "Lifetime LP money put in minus taken out — the cost basis of LP capital, read against vault value for aggregate LP PnL.",
    math: "\\text{net\\_deposits}=\\text{total\\_supplied}-\\text{total\\_withdrawn}",
    points: [
      "Source `data.net_deposits`, scaled by $1e6$.",
    ],
  },
  "sparkline": {
    title: "Sparkline",
    body: "A tiny axis-less trend line — left end is the start of the window, right end is now — showing pure shape, not absolute level.",
    points: [
      "$y$ normalized to the series min/max.",
      "Renders only with $\\ge2$ points; stroke = accent-brand.",
    ],
  },
  "stress-available": {
    title: "Stress available",
    body: "Free vault capital available to absorb the modeled payout — the numerator of the stress buffer.",
    math: "\\text{buffer}=\\frac{\\text{availLiq}}{\\text{stressedPayout}}",
    points: [
      "Source `data.available_liquidity`, scaled by $1e6$; safe tone.",
    ],
  },
  "stress-slider": {
    title: "Stress slider",
    body: "Drag to choose crash severity in standard deviations, driving the modeled move, stressed spot, payout and buffer.",
    points: [
      "Range $0..6\\,\\sigma$, step $0.5$, default $5$.",
      "Readout shows $\\sigma$ to 1 dp.",
    ],
  },
  "supplied": {
    title: "Supplied",
    body: "All dUSDC ever deposited into the vault by LPs — the gross inflow side of net deposits.",
    points: [
      "Source `data.total_supplied`, scaled by $1e6$; green tone.",
    ],
  },
  "vault-panel": {
    title: "Vault panel",
    body: "Answers 'is it safe for liquidity providers to underwrite this market?' — the PLP is the pooled dUSDC taking the other side of every binary trade.",
    points: [
      "PLP = Predict Liquidity Pool.",
    ],
  },
  "withdrawn": {
    title: "Withdrawn",
    body: "All dUSDC ever pulled out of the vault by LPs — the gross outflow side of net deposits.",
    points: [
      "Source `data.total_withdrawn`, scaled by $1e6$; dim tone.",
    ],
  },
  "perf-chart": {
    title: "Performance chart",
    body: "Area chart of PLP share price over time, the vault's running track record for LPs.",
    points: [
      "lightweight-charts; right price-axis at 4 dp (minMove $0.0001$).",
      "Hover shows exact share price (4 dp) plus that point's date.",
    ],
  },
  // — Desk (live flow / settle) —
  "flow-amount": {
    title: "Flow amount",
    body: "Each feed row's dollar figure, with one column overloaded by sign and color to read open-cost, win, or worthless-loss at a glance.",
    points: [
      "$-\\$\\text{cost}$ = premium paid to open (mint, dim).",
      "$+\\$\\text{payout}$ = winning settle (redeem, green); $\\$0.00$ = expired worthless (faint).",
      "2 dp, U+2212 minus glyph.",
    ],
  },
  "flow-columns": {
    title: "Feed columns",
    body: "What each column in the live trade feed means, ordered newest-first.",
    points: [
      "Time = UTC HH:MM:SS the event hit chain; Side = UP/DN direction.",
      "Strike = settle price level (1e9-scaled $).",
      "Prem/payout = premium out (mint, $-$) or payout in (redeem, $+$).",
    ],
  },
  "taker-win": {
    title: "Taker win rate",
    body: "The share of settled bets where the trader made money – under 50% means the PLP vault has the edge.",
    math: "\\text{winRate}=\\frac{\\text{wins}}{\\text{total}}\\times 100",
    points: [
      "Wins = settled positions with $\\text{payout}>0$.",
      "Green when $<50\\%$, amber when $\\ge 50\\%$.",
    ],
  },
  "up-dn-bar": {
    title: "Up / Dn bar",
    body: "A green-for-UP / red-for-DN bar showing the share of recent bets that are bullish vs bearish.",
    math: "\\text{upPct}=\\frac{\\text{upCount}}{\\text{mints}}\\times 100",
    points: [
      "Count-weighted, not premium-weighted.",
      "Defaults to 50% when there are no mints.",
    ],
  },
  "updn-win-split": {
    title: "Up / Dn win split",
    body: "How often bullish vs bearish bets won among settled positions – a big gap hints at directional mispricing of UP vs DN binaries.",
    math: "\\text{upWinRate},\\ \\text{dnWinRate}=\\frac{\\text{wins}}{\\text{count}}\\times 100",
    points: [
      "Computed within each UP/DN subset separately.",
    ],
  },
  "flow-side-glyph": {
    title: "Side glyph",
    body: "The per-row direction marker: green UP for a binary call, red DN for a binary put.",
    points: [
      "UP wins if $\\text{settle}\\ge\\text{strike}$; DN wins if $\\text{settle}<\\text{strike}$.",
      "Maps FlowItem.isUp.",
    ],
  },
  "payouts": {
    title: "Payouts",
    body: "Total dollars paid to winning takers across all settled positions – the vault's gross loss to traders.",
    points: [
      "Sum of PositionRedeemed.payout over wins only ($\\text{payout}>0$).",
      "1e6-scaled.",
    ],
  },
  "positioning": {
    title: "Positioning",
    body: "Crowd sentiment over the last N opened positions, i.e. which way recent traders are betting.",
    points: [
      "N = count of mint FlowItems in the window; redeems excluded.",
      "Order-flow direction, not settled outcomes.",
    ],
  },
  "row-mine": {
    title: "Your row",
    body: "A faint blue tint marks trades from your own connected wallet.",
    points: [
      "Applied when your account address equals the mint trader or redeem owner.",
      "Requires a connected Sui wallet.",
    ],
  },
  "settlement-count": {
    title: "Settlement count",
    body: "How many positions have actually settled in the redeemed feed.",
    points: [
      "N = count of redeemed positions with $\\text{is\\_settled}=\\text{true}$.",
      "The block renders only when $N>0$.",
    ],
  },
  "vol-premium": {
    title: "Volume premium",
    body: "Total premium paid to open all recent positions in the window – premium spent, not notional or payout exposure.",
    points: [
      "Sum of mint cost (raw 1e6 dUSDC).",
      "fmtUsdCompact, e.g. \\$12.3K.",
    ],
  },
  "desk-panel": {
    title: "Desk panel",
    body: "The 'can I act on it?' room – a live merged feed of position mints (order flow) and redeems (settlements) with aggregate positioning and settlement stats.",
    points: [
      "Polls /positions/minted and /redeemed every 6s.",
    ],
  },
  "flow-event-count": {
    title: "Flow event count",
    body: "How many recent trade events are loaded in the feed, capped at 80.",
    points: [
      "Merged mint+redeem FlowItems, sorted newest-first.",
      "Shows 'Live' until the first events arrive.",
    ],
  },
  "flow-unreachable": {
    title: "Flow unreachable",
    body: "Error state: the trade-flow source could not be reached – either /positions/minted or /redeemed errored.",
    points: [
      "Both endpoints are polled every 6s.",
    ],
  },
  // — Command strip + status bar + selectors —
  "indexer-status": {
    title: "Indexer status",
    body: "Health of the data indexer feeding every panel – OK means it has caught up to the chain.",
    points: [
      "From GET /status: green OK / amber Sync / red Offline.",
      "The footer's authoritative health readout, same source as the live pill.",
    ],
  },
  "lag": {
    title: "Feed lag",
    body: "How many seconds behind the chain the feed is – small is fresh, large means stale prices.",
    points: [
      "$\\text{data.max\\_time\\_lag\\_seconds}$ from GET /status, raw integer seconds.",
      "Shown in both the live pill and the footer.",
    ],
  },
  "live-pill": {
    title: "Live pill",
    body: "Whether fresh on-chain data is flowing right now.",
    points: [
      "Dot from GET /status: red = Offline (error), green = Live (OK), amber = Sync.",
      "The ping halo gates on the Tier-2 checkpoint push channel, distinct from the indexer poll.",
    ],
  },
  "connect-wallet": {
    title: "Connect wallet",
    body: "Connect a Sui wallet – once connected the pill is your account and gates the on-chain write actions.",
    points: [
      "Connected pill shows SuiNS name or truncateAddr (6/4) with a green dot; Testnet.",
      "The write path for the PLP vault: predict::supply / predict::withdraw.",
    ],
  },
  "market-selector": {
    title: "Market selector",
    body: "Picker of BTC markets still open for trading.",
    points: [
      "Lists oracles with derived status = active (activated, not settled), sorted by expiry.",
      "/oracles (~3.3k) is filtered client-side; Loading / 'No market' states disable selection.",
    ],
  },
  "utc-clock": {
    title: "UTC clock",
    body: "Current time in UTC – the universal trading clock so expiries and lag read unambiguously.",
    points: [
      "ISO slice HH:MM:SS; renders '--:--:--' until hydrated.",
      "Markets settle on UTC timestamps.",
    ],
  },
  "cmdk": {
    title: "Command palette — $\\text{Cmd+K}$",
    body: "Keyboard shortcut that opens the quick command palette.",
    points: [
      "Dispatches a 'deepskew:cmdk' window event the CommandPalette listens for.",
      "Trigger hidden below sm.",
    ],
  },
  "footer-links": {
    title: "Footer links",
    body: "Footer chrome – external links plus a network note, not metrics.",
    points: [
      "Links to DeepBook Predict docs and the DeepBook X account.",
      "'Mainnet when Predict ships' notes that deepskew follows Predict to Mainnet.",
    ],
  },
  "market-symbol": {
    title: "Market symbol",
    body: "The underlying asset of the market you're viewing, currently always Bitcoin.",
    points: [
      "Predict's Testnet lists only BTC rolling expiries.",
      "Symbol is fixed while the expiry varies.",
    ],
  },
  "network": {
    title: "Network",
    body: "Which Sui network the terminal reads – Testnet during the hackathon.",
    points: [
      "SUI_NETWORK constant.",
      "Predict is Testnet-only today; deepskew follows it to Mainnet at launch.",
    ],
  },
  "pill-tones": {
    title: "Pill tones",
    body: "Reusable colored capsule where color carries meaning – never decoration.",
    points: [
      "green = up, red = down/breach, cerulean = key/accent, amber = warn.",
      "Maps to semantic tokens $\\text{--safe}$ / $\\text{--breach}$ / $\\text{--warn}$ / $\\text{--accent-brand}$.",
    ],
  },
  "wordmark": {
    title: "Wordmark",
    body: "Product name and home link – clicking returns to the desk root.",
    points: [
      "DeepSkewMark glyph in cerulean.",
      "The authority signal of the desk.",
    ],
  },
  // — Vol analytics tab —
  "rnd": {
    title: "Risk-neutral density",
    body: "The full distribution of where the market prices BTC ending at expiry, recovered from one SVI smile — not a single number but the whole shape.",
    math: "q(k)=\\tfrac{g(k)}{\\sqrt{2\\pi w(k)}}\\,e^{-d_-(k)^2/2},\\quad d_-=-\\tfrac{k}{\\sqrt w}-\\tfrac{\\sqrt w}{2}",
    points: [
      "Breeden–Litzenberger via Gatheral; $g(k)$ is Durrleman's function.",
      "Normalised to integrate to 1 over the log-moneyness grid.",
    ],
  },
  "rnd-tail": {
    title: "Tail shape",
    body: "Which side of the distribution carries more weight — a fat left tail means crash risk is priced richer than upside.",
    points: [
      "Compares the 10% and 90% move quantiles: $q_{90}+q_{10}<0$ ⇒ fat left.",
      "Warn tone for left-skew (downside), safe for right-skew.",
    ],
  },
  "rnd-mode": {
    title: "Modal move",
    body: "The single most-likely outcome the density implies, as a percentage move versus the forward.",
    math: "\\text{mode}=e^{k^*}-1,\\quad k^*=\\arg\\max_k q(k)",
    points: ["Signed; near 0% when the smile is centred on the forward."],
  },
  "rnd-range": {
    title: "10–90% range",
    body: "The market-priced range of moves: from the 10th to the 90th percentile of the implied distribution.",
    points: ["Both legs are $e^{k}-1$ at the 10%/90% cumulative density."],
  },
  "rnd-pup": {
    title: "Risk-neutral P(up)",
    body: "The probability the underlying finishes above the forward, read off the implied density.",
    math: "P(\\text{up})=\\int_{k>0} q(k)\\,dk",
    points: ["P(down) = 1 − P(up); both integrate the same density."],
  },
  "density-nonneg": {
    title: "Density non-negativity",
    body: "A valid probability density can never go negative — which is exactly the butterfly-arbitrage condition on the smile.",
    points: [
      "$q(k)\\ge 0 \\iff g(k)\\ge 0$ (Durrleman).",
      "Green when the minimum sampled $g(k)\\ge0$; red flags an arb.",
    ],
  },
  "rr25": {
    title: "25Δ risk reversal",
    body: "How much richer 25-delta calls are than 25-delta puts, in vol points — the headline directional-skew gauge.",
    math: "\\text{RR}_{25}=\\text{IV}(25\\Delta\\,\\text{call})-\\text{IV}(25\\Delta\\,\\text{put})",
    points: [
      "Negative = puts bid (crash fear), the normal BTC regime; warn tone.",
      "25Δ strikes solved off the smile by inverting $N(d_1)$.",
    ],
  },
  "bf25": {
    title: "25Δ butterfly",
    body: "How much the 25-delta wings sit above the at-the-money vol — a measure of how convex (fat-tailed) the smile is.",
    math: "\\text{BF}_{25}=\\tfrac12\\big(\\text{IV}_c+\\text{IV}_p\\big)-\\text{IV}_{\\text{atm}}",
    points: ["In vol points; positive = wings richer than ATM."],
  },
  "implied-move": {
    title: "Implied move",
    body: "The 1-standard-deviation move the market prices into this expiry — the straddle-width breakeven.",
    math: "\\pm\\,\\sigma_{\\text{ATM}}\\sqrt{T}",
    points: ["Shown as a percentage of the forward."],
  },
  "forward-vol": {
    title: "Forward vol",
    body: "The volatility priced for the window between two expiries — exposes event risk a flat ATM curve hides.",
    math: "\\sigma_{\\text{fwd}}=\\sqrt{\\tfrac{w_2-w_1}{T_2-T_1}}",
    points: [
      "From ATM total variance $w=\\text{totalVariance}(0)$ at each tenor.",
      "Blank when variance isn't increasing (calendar-arb in the window).",
    ],
  },
  "atm-term-curve": {
    title: "ATM term structure",
    body: "At-the-money vol across every live expiry — upward (contango) means longer-dated vol is richer; inverted (backwardation) means near-term stress.",
    math: "\\sigma_{\\text{ATM}}(T)=\\sqrt{w(0)/T}",
    points: ["Plotted nearest→farthest; verdict from back minus front IV."],
  },
  "skew-rotation": {
    title: "Skew rotation",
    body: "How fast the risk reversal is moving — whether the desk is actively re-skewing the smile (a signal) or holding it steady.",
    math: "\\text{slope}=\\Delta\\text{RR}_{25}/\\Delta t",
    points: [
      "Vol points per hour over the cached SVI history.",
      "Falling = steepening put skew; rising = calls richening.",
    ],
  },
  // — Flow & edge tab —
  "edge-bps": {
    title: "Vault edge per fill",
    body: "How much more the vault charged than the binary is worth, per fill, in basis points — the premium-weighted average over the window.",
    math: "\\text{edge}=\\text{paid}-\\Phi(d_2),\\quad d_2=-\\tfrac{k}{\\sqrt w}-\\tfrac{\\sqrt w}{2}",
    points: [
      "Model-fair $\\Phi(d_2)$ uses each fill's own oracle SVI + forward.",
      "Green = vault overcharged (edge); red = takers got it cheap.",
    ],
  },
  "vol-risk-premium": {
    title: "Vol-risk-premium captured",
    body: "Cumulative signed dollar edge across the window — the realized premium the vault harvests for taking the other side.",
    math: "\\textstyle\\sum_i (\\text{paid}_i-\\text{fair}_i)\\cdot q_i",
    points: ["Positive when the book of fills was sold above model fair."],
  },
  "overpay-rate": {
    title: "Overpay rate",
    body: "The share of fills where the taker paid more than the model-fair probability — i.e. the vault had the edge on that trade.",
    points: ["Count of fills with paid > fair, over all marked fills."],
  },
  "edge-fills": {
    title: "Marked fills",
    body: "How many recent binary mints could be priced against a live SVI smile and scored for edge.",
    points: [
      "Only fills on active, quotable oracles are marked.",
      "Settled / un-fitted oracles are skipped.",
    ],
  },
  "edge-scatter": {
    title: "Paid vs fair",
    body: "Every fill plotted by the price paid against its model-fair value, with the break-even diagonal.",
    points: [
      "Below the diagonal (paid > fair) = vault edge (green).",
      "Dot size scales with contract quantity.",
    ],
  },
  "settlement-outcomes": {
    title: "Settlement outcomes",
    body: "Every settled position as a dot over time — UP lane above, DN below, green when the taker won, sized by payout.",
    points: ["From the redeemed feed where is_settled = true."],
  },
  "calibration": {
    title: "Calibration",
    body: "Does the price takers paid match how often that side actually won? A well-priced market sits on the diagonal.",
    points: [
      "Bar = average paid probability per side; tick = realized win rate.",
      "A gap means UP or DN binaries were systematically mis-priced.",
    ],
  },
  "pending-settlement": {
    title: "Pending settlement",
    body: "Oracles whose expiry has passed but which haven't settled yet — a 4th state the indexer's 3-state status can't express.",
    points: [
      "Active oracles with expiry < now.",
      "Positions there can't be redeemed until settlement lands.",
    ],
  },
  "net-flow": {
    title: "Net directional flow",
    body: "Premium spent opening UP binaries minus premium spent on DN over the window — the crowd's net directional bet, by money not count.",
    math: "\\text{net}=\\textstyle\\sum\\text{cost}_{\\uparrow}-\\sum\\text{cost}_{\\downarrow}",
    points: ["Green when net-long upside; red when net-long downside."],
  },
  "notional-positioning": {
    title: "Positioning by notional",
    body: "The UP/DN split of opening premium weighted by dollars, so one whale counts more than ten dust trades — the real order-flow skew.",
    points: ["Contrast with the count-based OI histogram on the Desk."],
  },
  "mint-redeem-momentum": {
    title: "Mint / redeem momentum",
    body: "Premium paid to open new positions vs payouts flowing out on redemptions — whether risk is being opened or unwound.",
    points: ["Mint-heavy = risk-on; redeem-heavy = unwind."],
  },
  "whale-flow": {
    title: "Whale flow",
    body: "The largest mints by premium in the window, with side, strike, moneyness and wallet — the size that actually moves the book.",
    points: ["Your own fills are tinted; sorted by premium."],
  },
  "range-flow": {
    title: "Range flow",
    body: "Vertical-spread (range) instruments that pay inside a strike band — a separate product line from the up/down binaries.",
    points: ["Premium and count of range mints over the window."],
  },
  "range-band": {
    title: "Band ladder",
    body: "Where range positions cluster: each top band drawn from its lower to upper strike, brighter for more notional.",
    points: ["Bands aggregated by (lower, higher) strike pair."],
  },
  // — Vault view —
  "mtm-concentration": {
    title: "MtM concentration",
    body: "How much of the vault's open risk rides on a single expiry — concentrated books blow up faster on one bad settlement.",
    math: "\\text{HHI}=\\textstyle\\sum_i s_i^2,\\quad s_i=\\tfrac{\\text{liability}_i}{\\sum\\text{liability}}",
    points: [
      "HHI ≥ 0.5 = concentrated; ≤ 0.25 = diversified.",
      "Top-expiry and top-3 shares of marked liability.",
    ],
  },
  "marked-liability": {
    title: "Marked liability",
    body: "What the vault owes per expiry, valuing every open binary at its model-fair Φ(d₂) — the reconstructed contribution to total MtM.",
    points: [
      "Open quantity per (oracle, strike, side) marked at fair value.",
      "Bar colour = net directional inventory (green up, red down).",
    ],
  },
  "mtm-tieout": {
    title: "MtM tie-out",
    body: "The protocol's own total MtM, shown alongside the reconstructed liability as a sanity check — they should track, but the reconstruction is an estimate.",
    points: [
      "Reconstruction marks at client Φ(d₂); the contract uses cached matrix MtM.",
      "Bounded by the indexer flow window (see 'partial book').",
    ],
  },
  "book-truncated": {
    title: "Partial book",
    body: "The flow window hit the indexer's row limit, so the reconstructed exposure is a lower bound — older open positions may be missing.",
    points: ["Fetch capped at 1000 rows; treat totals as a floor."],
  },
  "breach-sigma": {
    title: "Breach σ",
    body: "The worst-direction σ-shock the vault survives before LP equity is wiped — repricing the whole book through the SVI smile.",
    math: "\\sigma_{\\text{breach}}=\\min\\{|n|:\\text{vaultValue}(n)\\le 0\\}",
    points: [
      "Forward shocked $F\\,e^{n\\sigma_T}$ per oracle, smile held fixed.",
      "Stressed value applies Δliability to the live vault value.",
    ],
  },
  "scenario-curve": {
    title: "Scenario curve",
    body: "Vault value across the full ±5σ shock range — where it crosses zero is the breach point.",
    points: ["x = σ multiple; y = stressed vault value in dUSDC."],
  },
  "scenario-ladder": {
    title: "Scenario ladder",
    body: "The stressed vault value and buffer at fixed ±1/3/5σ, so you can read the whole tail at a glance.",
    points: ["Buffer = stressed value ÷ current value; red below zero."],
  },
  "withdrawal-limiter": {
    title: "Withdrawal limiter",
    body: "The cap on how much LPs can pull out right now — the binding minimum of free liquidity and the limiter's budget.",
    math: "\\text{exit}=\\min(\\text{available\\_liquidity},\\,\\text{available\\_withdrawal})",
    points: [
      "Open = limiter not binding; Throttled = limiter caps exit; Drained ≈ 0.",
    ],
  },
  "exit-capacity": {
    title: "Exit capacity",
    body: "The limiter's current withdrawal budget against the vault's free liquidity — how much can leave before the throttle bites.",
    points: ["available_withdrawal from the vault summary (1e6)."],
  },
  "solvency-floor": {
    title: "Solvency floor",
    body: "Cash left after the worst-case payout is reserved — the hard floor under withdrawals independent of the limiter.",
    math: "\\max(0,\\ \\text{vault\\_balance}-\\text{total\\_max\\_payout})",
    points: ["Whichever of this and the limiter budget is smaller binds."],
  },
  "max-drawdown": {
    title: "Max drawdown",
    body: "The deepest peak-to-trough fall in PLP share price over the range — the loss an LP who bought the top would have worn.",
    math: "\\min_t\\Big(\\tfrac{\\text{share}_t}{\\max_{s\\le t}\\text{share}_s}-1\\Big)",
    points: ["0% means share price only ever made new highs."],
  },
  "drawdown-replay": {
    title: "Underwater curve",
    body: "How far below its running peak the PLP share price sits at each point — flat at 0 on the highs, dipping when underwater.",
    points: ["Range selector replays 1D / 1W / 1M / 3M / ALL."],
  },
  "lp-vol": {
    title: "LP volatility",
    body: "Annualised volatility of PLP share-price returns — how bumpy the LP ride has been.",
    math: "\\text{stdev}(\\ln r)\\cdot\\sqrt{n/\\text{years}}",
    points: ["From log share-price returns over the range."],
  },
  "risk-grade": {
    title: "Risk grade",
    body: "A composite LP-safety read — GREEN/AMBER/RED from utilization, MtM concentration and exit capacity.",
    points: [
      "Worst of: utilization, max-payout utilization, top-expiry share, exit ratio.",
      "Export the metrics as CSV or print the one-pager.",
    ],
  },
  "house-rules": {
    title: "House rules",
    body: "The live on-chain pricing and risk config the desk operates under — spread parameters and the trading-paused kill-switch.",
    points: [
      "From GET /config; null fields mean not yet published on-chain.",
      "Spreads shown in basis points (1e9-scaled probability units).",
    ],
  },
  "exposure-ceiling": {
    title: "Exposure ceiling",
    body: "The maximum share of the vault that may back open positions before new mints are blocked — the protocol's hard risk gate.",
    points: ["RiskConfig.max_total_exposure_pct; null until published."],
  },
  "lp-economics": {
    title: "LP economics",
    body: "The vault's running LP track record — share price, net deposits, and gross supplied/withdrawn — shown when the on-chain pricing/risk config isn't published yet.",
    points: ["All from the vault summary (share price + 1e6 amounts)."],
  },
  // — Accounts tab —
  "leaderboard": {
    title: "Manager leaderboard",
    body: "Per-manager realized PnL attribution, ranked — the indexer's authoritative account roll-ups for the most active desks.",
    points: [
      "Cohort = highest-volume managers in the flow window.",
      "Rank by realized PnL, account value or open exposure.",
    ],
  },
  "equity-curve": {
    title: "Equity curve",
    body: "A desk's cumulative realized PnL over time — the shape of how it made (or lost) money.",
    points: ["From the manager's realized-PnL series."],
  },
  "account-blotter": {
    title: "Account blotter",
    body: "The connected wallet's positions marked to market server-side, plus the account roll-up — including claimable winnings awaiting settlement.",
    points: ["Aggregated across all of the wallet's manager accounts."],
  },
  "manager-market": {
    title: "Market managers",
    body: "Desk-level activity across the whole venue — how many PredictManager accounts exist and how many traded in the recent window.",
    points: [
      "Total from the /managers directory; active = distinct managers in flow.",
      "Vault net = premium in minus settled payouts out.",
    ],
  },
  "account-value": {
    title: "Account value",
    body: "Total worth of the account: trading balance plus the mark value of open positions and redeemable winnings.",
    points: ["From the manager summary (1e6)."],
  },
  "open-exposure": {
    title: "Open exposure",
    body: "Capital tied up in open positions right now — the account's at-risk notional.",
    points: ["From the manager summary (1e6)."],
  },
  "redeemable": {
    title: "Redeemable",
    body: "Winnings on settled positions that can be claimed now — value sitting idle until redeemed.",
    points: ["From the manager summary (1e6)."],
  },
  // — Ops / health tab —
  "feed-staleness": {
    title: "Feed staleness",
    body: "How long since each oracle last published a price/SVI update. Past the 30s window the contract treats the feed as stale and mints revert.",
    points: [
      "Active = fresh; Stale = > 30s; Pending = expired, not yet settled.",
      "Verdict is HALTED if trading is paused, else DEGRADED if any are bad.",
    ],
  },
  "pipeline-lag": {
    title: "Pipeline lag",
    body: "Per-pipeline indexer lag — how far behind chain each event pipeline is, beyond the single aggregate lag the footer shows.",
    points: [
      "Time lag in seconds and checkpoint lag per pipeline.",
      "Backfill pipelines are excluded.",
    ],
  },
  "kill-switch": {
    title: "Kill-switch & assets",
    body: "The trading-paused flag and the set of enabled quote assets the market currently accepts.",
    points: ["From GET /config; paused halts all mints."],
  },
  // — Cross-venue tab —
  "vol-arb": {
    title: "Vol-arb spread",
    body: "Predict's ATM vol minus Deribit's BTC DVOL index — when Predict trades rich the vault is selling vol above the reference.",
    points: [
      "≥ 2 vol points flags an actionable cross-venue spread.",
      "Rich = sell Predict vol; cheap = buy it.",
    ],
  },
  "dvol": {
    title: "Deribit DVOL",
    body: "Deribit's BTC volatility index — the market-standard reference for 30-day implied vol, pulled hourly.",
    points: ["External reference; CORS-open public API."],
  },
  "vrp": {
    title: "Vol-risk-premium",
    body: "Implied vol minus trailing realized vol — what option sellers earn for bearing risk. Positive means options are rich, the LP's edge.",
    math: "\\text{VRP}=\\sigma_{\\text{implied}}-\\sigma_{\\text{realized}}",
    points: ["Sell-vol when positive; buy-vol when negative."],
  },
  "realized-vol": {
    title: "Realized vol",
    body: "Annualised volatility of actual BTC returns over the trailing window, from Binance hourly closes.",
    math: "\\text{stdev}(\\ln r)\\cdot\\sqrt{24\\cdot365.25}",
    points: ["24h rolling window of hourly log returns."],
  },
  "implied-vs-realized": {
    title: "Implied vs realized",
    body: "The two vol lines whose gap is the vol-risk-premium — implied (DVOL) over realized (Binance).",
    points: ["Shaded gap is the premium option sellers capture."],
  },
};

/** The glossary grouped by desk area, in source order — drives the docs
 *  reference page (`/docs/glossary`). Keys index into GLOSSARY; titles are
 *  Title Case per DESIGN.md §4. Keep in sync when adding terms. */
export const GLOSSARY_GROUPS: { title: string; keys: string[] }[] = [
  { title: "IV Surface", keys: ["arb-free", "atm-term-overlay", "butterfly-arb", "calendar-arb", "iv-heat-legend", "iv-surface-panel", "moneyness-readout", "surface-iv-readout", "svi-model", "real-vs-interp-ribs", "strike-axis-hint", "surface-height", "tenor-countdown", "tick-pulse", "drag-to-orbit", "n-tenors", "surface-resolving", "tenor-axis"] },
  { title: "Smile / Skew", keys: ["atm-iv", "call-wing", "fly", "put-wing", "skew-rr", "histogram-axis", "histogram-hover", "live-replay", "oi-by-strike", "smile-hover", "smile-panel", "smile-x-ticks", "smile-y-tick", "time-travel", "up-dn-legend", "jump-to-live", "smile-states"] },
  { title: "Oracle State · SVI Params", keys: ["atm-var", "checkpoint", "expiry", "forward", "oracle-panel", "strike-matrix-ticks", "svi-a", "svi-b", "svi-m", "svi-rho", "svi-sigma", "term-structure", "feed-age", "oracle-status", "vol-by-strike", "oracle-id", "spot", "spot-sparkline"] },
  { title: "Desk · Vault", keys: ["apy", "available-liq", "lp-net-flow", "max-payout", "max-payout-util", "modeled-payout", "plp-share-price", "plp-supply", "sigma-move", "stress-ladder", "stress-sigma", "stress-verdict", "stressed-spot", "total-mtm", "utilization", "vault-value", "dusdc", "net-deposits", "sparkline", "stress-available", "stress-slider", "supplied", "vault-panel", "withdrawn", "perf-chart"] },
  { title: "Desk · Live Flow & Settle", keys: ["flow-amount", "flow-columns", "taker-win", "up-dn-bar", "updn-win-split", "flow-side-glyph", "payouts", "positioning", "row-mine", "settlement-count", "vol-premium", "desk-panel", "flow-event-count", "flow-unreachable"] },
  { title: "Command Strip, Status Bar & Selectors", keys: ["indexer-status", "lag", "live-pill", "connect-wallet", "market-selector", "utc-clock", "cmdk", "footer-links", "market-symbol", "network", "pill-tones", "wordmark"] },
  { title: "Vol Analytics", keys: ["rnd", "rnd-tail", "rnd-mode", "rnd-range", "rnd-pup", "density-nonneg", "rr25", "bf25", "implied-move", "forward-vol", "atm-term-curve", "skew-rotation"] },
  { title: "Flow & Edge", keys: ["edge-bps", "vol-risk-premium", "overpay-rate", "edge-fills", "edge-scatter", "settlement-outcomes", "calibration", "pending-settlement", "net-flow", "notional-positioning", "mint-redeem-momentum", "whale-flow", "range-flow", "range-band"] },
  { title: "Vault", keys: ["mtm-concentration", "marked-liability", "mtm-tieout", "book-truncated", "breach-sigma", "scenario-curve", "scenario-ladder", "withdrawal-limiter", "exit-capacity", "solvency-floor", "max-drawdown", "drawdown-replay", "lp-vol", "risk-grade", "house-rules", "exposure-ceiling", "lp-economics"] },
  { title: "Accounts", keys: ["leaderboard", "equity-curve", "account-blotter", "manager-market", "account-value", "open-exposure", "redeemable"] },
  { title: "Ops / Health", keys: ["feed-staleness", "feed-expired", "pipeline-lag", "kill-switch"] },
  { title: "Cross-Venue", keys: ["vol-arb", "dvol", "vrp", "realized-vol", "implied-vs-realized"] },
];
