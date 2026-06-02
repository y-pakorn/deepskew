<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DEEPSKEW

DeepBook Predict analytics/ops terminal for **Sui Overflow 2026**. The full build
plan lives in **PLAN.md** (repo root, gitignored) — read it first for product,
data layer, SVI math, and contract integration.

## Commands (pnpm only)

- `pnpm dev` — http://localhost:3000 (the **terminal is the root** `/`)
- `pnpm build` · `pnpm start` · `pnpm lint`

## Conventions

- **Dark only.** Design system = **Tatem** ("Midnight Terminal"). Tokens in
  `src/app/globals.css`: primitives (`--canvas` #000, `--panel` #161616,
  `--accent-brand` #007eed cerulean, `--text*`, semantic `--safe/--warn/--breach`)
  with shadcn semantic tokens (`--background/--card/--primary/…`) aliased onto
  them. Custom utilities: `bg-canvas`, `bg-panel`, `text-text-sec/-dim/-faint`,
  `text-accent-brand`, `border-hairline`, `.label-micro`.
- **Type:** Inter for UI; **JetBrains Mono (tabular)** for every number, address,
  and SVI param.
- **shadcn/ui** (new-york) in `src/components/ui` — add via
  `pnpm dlx shadcn@latest add <name>`. `cn()` in `src/lib/utils.ts`.
- **Sui:** the new **`@mysten/dapp-kit-react` 2.0** (NOT legacy
  `@mysten/dapp-kit`). Instance in `src/lib/sui/dapp-kit.ts` (`createDAppKit` +
  `SuiGrpcClient`, testnet). Hooks: `useCurrentAccount`, `useDAppKit`,
  `useWallets`, `useCurrentClient`. Wallet UI is **client-only** behind
  `next/dynamic({ ssr:false })`.
- **Indexer:** `src/lib/indexer` (client + React Query hooks). CORS is open —
  call it directly, no proxy.
- **SVI math:** `src/lib/svi.ts` (total variance, IV, Durrleman butterfly +
  calendar arbitrage checks).
- **Next 16:** Turbopack default (no webpack config), async `params/searchParams`,
  no `next lint` (use `pnpm lint`), `middleware.ts` → `proxy.ts`.

## Design principle

**Instrument, not dashboard** — every panel leads with one verdict in big mono;
data supports it underneath. Color = information, never decoration.
