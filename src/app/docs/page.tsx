import type { Metadata } from "next";
import {
  Callout,
  DocArticle,
  DocLink,
  DocSection,
  LI,
  P,
  UL,
  ViewCard,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "Docs · Overview",
  description:
    "deepskew is the legibility layer for DeepBook Predict: it reads the live volatility surface, vault, and settlement flow from the chain, makes them legible, and lets you act on the PLP vault on-chain.",
  alternates: { canonical: "/docs" },
};

const VIEWS = [
  { title: "Desk", route: "/", anchor: "desk", blurb: "The single-viewport instrument: the 3D vol surface, the smile with its arbitrage verdict, oracle state, the vault, and a live tape of mints and redeems." },
  { title: "Vol Analytics", route: "/vol", anchor: "vol-analytics", blurb: "The volatility desk in depth: the smile across log-moneyness, skew and term structure, the risk-neutral density, and smile dynamics over time." },
  { title: "Flow & Edge", route: "/flow", anchor: "flow-edge", blurb: "Where the vault's edge is made or lost: every fill scored against its model-fair price, settlement calibration, whale flow, and range-product flow." },
  { title: "Vault", route: "/risk", anchor: "vault", blurb: "The vault is the counterparty to every position. Per-expiry exposure, a 5-sigma breach point, exit capacity, a GREEN/AMBER/RED grade, and the supply/withdraw funnel." },
  { title: "Managers", route: "/managers", anchor: "managers", blurb: "The desk leaderboard: every trading account ranked by volume with realized and unrealized PnL, drill-through to a per-desk page." },
  { title: "Ops / Health", route: "/ops", anchor: "ops-health", blurb: "One read on whether the market is trustworthy right now: oracle-feed freshness and indexer lag against the chain head." },
  { title: "Cross-Venue", route: "/cross-venue", anchor: "cross-venue", blurb: "On-chain volatility in context: Predict vs Deribit DVOL, the vol-risk-premium, and the DeepBook stack composability loop." },
];

export default function DocsOverview() {
  return (
    <DocArticle
      eyebrow="Overview"
      title="The legibility layer for DeepBook Predict"
      lead={
        <>
          DeepBook Predict puts options-style volatility trading on-chain: an
          oracle publishes a volatility surface, a liquidity vault underwrites
          every position, and traders mint and redeem against it block by block.
          The information is on-chain. The meaning is not. deepskew reads it,
          makes it legible, and lets you act on it.
        </>
      }
    >
      <DocSection title="The Idea">
        <P>
          A traditional options desk keeps a wall of tools open for exactly this:
          a surface viewer, an arbitrage monitor, a risk engine, a blotter.
          On-chain volatility has none of it. The data is public and the protocol
          is permissionless, but you still have to decode fixed-point parameters,
          run the vol math yourself, and rebuild state from a stream of events
          before you can answer a basic question like {""}
          <em>is this surface fair</em> or <em>can the vault take this trade</em>.
        </P>
        <P>
          deepskew closes that gap. It does the decoding, the math, and the
          reconstruction for you, refuses to show a number without showing what
          it means, and where a read leads to an action it closes the loop:
          supply or withdraw the PLP vault on-chain straight from the Vault
          verdict.
        </P>
      </DocSection>

      <DocSection title="The Seven Views">
        <P>
          deepskew is one persistent desk with seven routed views. The market
          selection, the wallet, and the live query cache live in the shell, so
          moving between views keeps the data warm.
        </P>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VIEWS.map((v) => (
            <ViewCard
              key={v.title}
              title={v.title}
              blurb={v.blurb}
              route={v.route}
              docHref={`/docs/views#${v.anchor}`}
            />
          ))}
        </div>
      </DocSection>

      <Callout title="Verify it in 60 seconds" tone="accent">
        Every figure is computed from current on-chain state, and every figure is
        checkable. Open the desk, watch the cerulean pulse on each oracle tick,
        click any settlement to see it on Suiscan, and read the formula behind
        any number in the glossary. The full path is in{" "}
        <DocLink href="/docs/verify">Verify It&rsquo;s Real</DocLink>.
      </Callout>

      <DocSection title="What You Can Do">
        <UL>
          <LI>
            <strong className="text-text-sec">Read the surface.</strong> The full
            BTC vol surface in 3D, the current smile with its butterfly and
            calendar arbitrage verdict, and the risk-neutral density it prices.
          </LI>
          <LI>
            <strong className="text-text-sec">Read the vault.</strong> The PLP
            vault repriced out to five sigma, per-expiry concentration, exit
            capacity against the withdrawal limiter, and one graded verdict on
            the Vault view.
          </LI>
          <LI>
            <strong className="text-text-sec">Act on it.</strong> Supply or
            withdraw dUSDC to the PLP vault on-chain, with a real{" "}
            <code className="font-mono text-text-sec">predict::supply</code> /{" "}
            <code className="font-mono text-text-sec">predict::withdraw</code>,
            clamped to the live limiter budget and free liquidity.
          </LI>
        </UL>
      </DocSection>

      <DocSection title="Roadmap">
        <UL>
          <LI>Reads and transacts on Sui Testnet today.</LI>
          <LI>
            Follows Predict to Mainnet at launch: the read and write logic is
            network-agnostic, so it is a network and market-resolution change,
            not a rewrite.
          </LI>
          <LI>
            Read-only to read-write is done: the desk now calls the contract, not
            just reads it.
          </LI>
          <LI>
            Next: settled-redeem keepers and deeper composability across{" "}
            <code className="font-mono text-text-sec">deepbook_margin</code> and
            DeepBook spot.
          </LI>
        </UL>
      </DocSection>

      <DocSection title="Start Here">
        <UL>
          <LI>
            <DocLink href="/docs/views">The Desk Views</DocLink> — how to read
            each of the seven views.
          </LI>
          <LI>
            <DocLink href="/docs/math">Methodology</DocLink> — the volatility and
            risk math, typeset, with where each is computed.
          </LI>
          <LI>
            <DocLink href="/docs/integration">On-Chain Integration</DocLink> — the
            objects, the read path, and the write path.
          </LI>
          <LI>
            <DocLink href="/docs/liquidity">Provide Liquidity</DocLink> — connect,
            fund, and supply or withdraw the vault.
          </LI>
          <LI>
            <DocLink href="/">Open the desk</DocLink> — the live terminal.
          </LI>
        </UL>
      </DocSection>
    </DocArticle>
  );
}
