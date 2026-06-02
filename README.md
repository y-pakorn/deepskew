# DEEPSKEW

> A Dense Quant Terminal for **DeepBook Predict** on Sui — a live on-chain BTC
> implied-volatility surface, an arbitrage-free checker, a ±5σ PLP vault risk
> simulator, and a one-click settlement desk. **Make Predict legible.**
> · [deepskew.xyz](https://deepskew.xyz)

Built for **Sui Overflow 2026** (DeepBook specialized track). An _instrument,
not a dashboard_: every panel leads with a verdict; the data supports it.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · TypeScript · **pnpm**
- **Tailwind CSS v4** · **shadcn/ui** (new-york) · **Tatem** design system
  (dark "Midnight Terminal")
- **Sui testnet** — `@mysten/sui` 2.17, `@mysten/dapp-kit-react` 2.0
  (`createDAppKit` + gRPC), `@mysten/enoki`
- `@tanstack/react-query` · `react-three-fiber` / `three` (vol surface) ·
  `lightweight-charts` · `motion`
- Fonts: **Inter** (UI) + **JetBrains Mono** (tabular numbers)

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:3000 — the terminal is the root
pnpm build
pnpm start
pnpm lint
```

## Architecture

```
src/
├── app/
│   ├── layout.tsx        # root layout + SSR metadata + <Providers>
│   ├── providers.tsx     # QueryClient + Tooltip + Toaster (SSR-safe)
│   └── page.tsx          # the terminal (client-only, ssr:false dApp Kit boundary)
├── components/
│   ├── terminal/         # command strip + Surface/Smile/Oracle/Vault/Desk panels
│   ├── sui/              # dApp Kit provider + connect button
│   └── ui/               # shadcn/ui
└── lib/
    ├── indexer/          # typed Predict indexer client + React Query hooks
    ├── sui/              # dApp Kit instance + testnet constants
    └── svi.ts            # raw-SVI math: total variance, IV, arb-free checks
```

## Data

Three tiers (see `PLAN.md`): the **indexer** (`predict-server.testnet.mystenlabs.com`,
open CORS) for history/aggregates; **live Sui events** for freshness; **direct
object reads** for authoritative state. SVI params are decoded from fixed-point
and fed through the vol math for IV surfaces and Durrleman butterfly / calendar
arbitrage checks.

The full product, design, and integration plan lives in `PLAN.md` (repo root).

## Status

Testnet. **Redeploys on mainnet day one.**
