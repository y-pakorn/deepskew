# deepskew

**A quant terminal for DeepBook Predict on Sui.**

[deepskew.xyz](https://deepskew.xyz)

![deepskew](https://deepskew.xyz/opengraph-image)

DeepBook Predict puts options-style volatility trading on-chain. An oracle publishes a volatility surface, a liquidity vault underwrites every position, and traders mint and redeem against it block by block. It all settles on Sui in the open. The problem is that none of it is readable. A raw SVI parameter set tells you nothing about whether the surface admits arbitrage. A vault balance tells you nothing about whether it survives a sharp move in BTC. The information is on-chain. The meaning is not.

deepskew is the legibility layer. It reads the live surface, the vault, and the settlement flow straight from the chain and turns each one into a single clear read with the numbers that back it underneath. It is the screen a desk would keep open while the market is live. And it closes the loop: where a read leads to an action, you supply or withdraw the PLP vault on-chain without leaving the verdict.

## Why it exists

A traditional options desk has a wall of tools for exactly this: a surface viewer, an arbitrage monitor, a risk engine, a blotter. On-chain volatility has none of it. The data is public and the protocol is permissionless, which is the whole promise, but in practice you still have to decode fixed-point parameters, run the vol math yourself, and rebuild state from a stream of events before you can answer a basic question like "is this surface fair" or "can the vault take this trade."

That gap is what keeps serious flow out. deepskew closes it by doing the decoding, the math, and the reconstruction for you, and by refusing to show a number without showing what it means.

## What's inside

deepskew is one persistent desk with seven routed views. The market selection, the wallet, and the live query cache live in the shell, so moving between views keeps the data warm.

### Desk

The single-viewport instrument. The full BTC vol surface in 3D across strike and expiry, the current expiry's smile with its butterfly and calendar arbitrage verdict, the oracle state (spot, forward, ATM IV, the vol-by-strike matrix, and the raw SVI parameters), the PLP vault with its sigma stress, and a live tape of mints and redeems with running win rates. Every panel leads with one answer.

### Vol Analytics (`/vol`)

The volatility desk in depth. The smile across log-moneyness, the skew and term structure with 25-delta risk reversals and butterflies, forward vol and implied move per tenor, the risk-neutral density the surface prices (via Breeden-Litzenberger) with a digital probability ladder, and smile dynamics that measure whether the skew is rotating and how the SVI parameters drift over time.

### Flow & Edge (`/flow`)

Where the vault's edge is made or lost. Every fill is scored against its model-fair price (the digital N(d2) from the live surface) to show the vol-risk-premium captured fill by fill, in basis points and in dollars. Alongside it: settlement calibration (priced probability against realized outcome), whale flow ranked by notional rather than count, and the range (vertical-spread) product flow.

### Vault (`/risk`)

The vault is the counterparty to every position, so its solvency is the market's solvency. This view reconstructs the open book from flow, marks every leg at fair value, and answers the LP's real questions: which expiry it is most concentrated in (HHI), at what BTC move it breaches (a full repricing out to five sigma sized by live ATM vol), the worst drawdown LPs have lived through, whether they can actually exit (limiter budget against free liquidity), and one GREEN, AMBER or RED grade that sums it up, exportable as a one-pager. When the verdict says the vault is safe to back, you act on it in place: a connect-gated panel supplies or withdraws dUSDC with a real `predict::supply` or `predict::withdraw`, clamped to the live withdrawal-limiter budget and free liquidity.

### Managers (`/managers`)

The desk leaderboard. Every trading account ranked by volume, with realized and unrealized PnL, account value, open exposure, and open positions, paginated and sortable, with drill-through to a per-desk page. The header rolls up market-wide activity and your own PnL.

### Ops / Health (`/ops`)

One read on whether the market is trustworthy right now. Per-feed oracle freshness against the staleness window, per-pipeline indexer lag against the chain head, and a single global verdict over the live data path. If a feed is stale or the indexer is behind, this is where it shows first.

### Cross-Venue (`/cross-venue`)

On-chain volatility in context. Predict's ATM vol against Deribit's DVOL index per tenor (where Predict is rich or cheap), and the volatility-risk-premium as Deribit implied vol minus Binance realized vol, the spread that tells an LP whether selling vol carries an edge. Alongside it, the DeepBook stack itself: a composability read that frames the borrow-and-supply loop across Predict, `deepbook_margin` and DeepBook spot, pricing the live margin borrow rate against the PLP supply yield.

## How it reads

An instrument, not a dashboard. Every panel answers one question and leads with the answer in a single large figure. Everything else on the panel is there to justify that figure. Color is reserved for meaning: green is safe, amber is caution, red is a breach, cerulean is data and interaction, and nothing is colored for decoration. The result is a screen you can read at a glance and trust on a second look. The full design system lives in [DESIGN.md](./DESIGN.md).

## Built on live state

Every figure on screen is computed from current on-chain state. The surface comes from the oracle's published SVI parameters, the risk numbers from the vault's real reserves and exposure, the tape from settlement events as they land, the cross-venue references from Deribit and Binance directly. Nothing is sampled, mocked, or backfilled with placeholder data. If the chain has not produced it yet, deepskew does not show it. And it stays checkable: every fill and settlement row links to its transaction on Suiscan, and the status bar points straight at the package and source objects the desk reads.

## The math

All of it is pure and lives in `src/lib`, computed in the browser from decoded on-chain parameters.

- **SVI surface.** Raw SVI total variance `w(k) = a + b(rho(k - m) + sqrt((k - m)^2 + sigma^2))`, with implied vol `sqrt(w/T)` (`src/lib/svi.ts`).
- **Arbitrage-free checks.** Durrleman's butterfly condition `g(k) >= 0` sampled across the smile, and the calendar condition that total variance is non-decreasing in maturity.
- **Digital pricing.** The fair value of every binary as `P(S_T > K) = N(d2)`, the price each on-chain fill is scored against.
- **Risk-neutral density.** Breeden-Litzenberger applied to the SVI smile, normalized numerically, with mode, P(up), and tail quantiles.
- **Skew metrics.** 25-delta risk reversal and butterfly via a delta-to-strike solve, forward vol between tenors, and implied move.
- **Vault risk.** Open-book reconstruction from flow, per-oracle attribution with HHI, and a book-wide repricing out to five sigma to find the breach point.
- **Vol-risk-premium.** Annualized realized vol from log returns against the implied reference.

## Tech

- **Next 16** (App Router, Turbopack) and **React 19**, TypeScript, Tailwind v4 with a CSS-first token theme, and shadcn/ui.
- **Sui** via the new `@mysten/dapp-kit-react` 2.0 on a gRPC client (testnet): reads go through `client.core`, and writes (PLP supply and withdraw) are built with the `@mysten/sui` Transaction builder and signed through the dApp Kit.
- **TanStack Query** over a typed indexer client for all live data (`src/lib/indexer`).
- **three** with React Three Fiber and Drei for the 3D surface, **lightweight-charts** for time series, hand-rolled SVG for smiles, sparklines and ladders, and **KaTeX** for the math glossary.
- **motion** for the live-state transitions, scoped to data changes only.

## Status

Reads and transacts on Sui testnet today, where DeepBook Predict currently lives. The read and write logic is network-agnostic, so deepskew follows Predict to mainnet at launch: point it at the mainnet network and resolve the live markets at runtime (mainnet will list several, not the single testnet market).

## Run it locally

```bash
pnpm install
pnpm dev      # http://localhost:3000  (the terminal is the root /)
pnpm build    # production build
pnpm start    # serve the build
pnpm lint
```

## Project layout

```
src/
  app/                 routes (the desk shell + 7 views) and metadata assets
  components/terminal/ every panel, grouped by view (surface, vol, flow, plp, ...)
  lib/
    svi.ts             the SVI + arbitrage + density math
    analytics.ts       open-book reconstruction, edge, scenario engine
    cross-venue.ts     Deribit and Binance references
    deepbook.ts        DeepBook v3 spot + margin (composability reads)
    indexer/           typed indexer client + React Query hooks
    og/                the social-card renderer (per-route, live snapshot)
    sui/               dapp-kit instance, constants, network config, tx builders
DESIGN.md              the Tatem design system (source of truth)
```
