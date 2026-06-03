# DeepSkew

**A quant terminal for DeepBook Predict on Sui.**

[deepskew.xyz](https://deepskew.xyz)

DeepBook Predict puts options-style volatility trading on-chain. An oracle publishes a volatility surface, a liquidity vault underwrites every position, and traders mint and redeem against it block by block. It all settles on Sui in the open. The problem is that none of it is readable. A raw SVI parameter set tells you nothing about whether the surface admits arbitrage. A vault balance tells you nothing about whether it survives a sharp move in BTC. The information is on-chain. The meaning is not.

DeepSkew is the legibility layer. It reads the live surface, the vault, and the settlement flow straight from the chain and turns each one into a single clear read with the numbers that back it underneath. It is the screen a desk would keep open while the market is live.

## Why it exists

A traditional options desk has a wall of tools for exactly this: a surface viewer, an arbitrage monitor, a risk engine, a blotter. On-chain volatility has none of it. The data is public and the protocol is permissionless, which is the whole promise, but in practice you still have to decode fixed-point parameters, run the vol math yourself, and rebuild state from a stream of events before you can answer a basic question like "is this surface fair" or "can the vault take this trade."

That gap is what keeps serious flow out. DeepSkew closes it by doing the decoding, the math, and the reconstruction for you, and by refusing to show a number without showing what it means.

## What we're building

**A live implied-volatility surface.** The full BTC vol surface, reconstructed from the protocol's on-chain SVI parameters and drawn in 3D across strike and expiry. It updates as new parameters land on-chain, so you are always looking at the current market and not a snapshot. The shape is the point: where the skew steepens, where the term structure inverts, where the wings blow out.

**An arbitrage check that runs continuously.** A vol surface can be inconsistent in two ways, and both let someone trade against the vault for free. DeepSkew tests every surface for butterfly arbitrage within each expiry and calendar arbitrage across expiries, and leads with the verdict. A clean surface says so. A broken one shows which expiry fails and by how much.

**A vault risk simulator.** The vault is the counterparty to every position, so its solvency is the market's solvency. DeepSkew stress-tests it against BTC moves out to ±5σ, sized by the live at-the-money volatility, and shows how much buffer is left at each shock. It answers the only question a liquidity provider really has: at what move does this break.

**A live settlement tape.** Positions minted and redeemed stream in as they happen, with running win rates and payouts, so you can watch how the market is resolving instead of reconstructing it after the fact.

## How it reads

An instrument, not a dashboard. Every panel answers one question and leads with the answer in a single large figure. Everything else on the panel is there to justify that figure. Color is reserved for meaning: green is safe, amber is caution, red is a breach, and nothing is colored for decoration. The result is a screen you can read at a glance and trust on a second look.

## Built on live state

Every figure on screen is computed from current on-chain state. The surface comes from the oracle's published SVI parameters, the risk numbers from the vault's real reserves and exposure, the tape from settlement events as they land. Nothing is sampled, mocked, or backfilled with placeholder data. If the chain has not produced it yet, DeepSkew does not show it.

## Status

Running on Sui testnet today. It redeploys to mainnet on day one.

## Run it locally

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # production build
```
