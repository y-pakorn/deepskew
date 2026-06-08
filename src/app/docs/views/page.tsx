import type { Metadata } from "next";
import {
  DocArticle,
  DocLink,
  DocSection,
  P,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "Docs · The Desk Views",
  description:
    "How to read each of deepskew's seven routed views: the Desk, Vol Analytics, Flow & Edge, PLP Risk, Managers, Ops / Health, and Cross-Venue. What question each one answers, its lead verdict, and how to read its panels.",
  alternates: { canonical: "/docs/views" },
};

export default function DeskViewsDocs() {
  return (
    <DocArticle
      eyebrow="Guide"
      title="The Desk Views"
      lead={
        <>
          deepskew is one persistent desk with seven routed views. The market
          selection, the wallet, and the live query cache live in the shell, so
          moving between views keeps the data warm. Each view answers a single
          question and leads with the answer in one large figure. Everything
          else on the panel is there to justify that figure.
        </>
      }
    >
      <DocSection title="Desk">
        <P>
          The Desk is the single-viewport instrument: the room you keep open
          while the market is live. It answers “what is the surface saying right
          now, and can I act on it?“ The full BTC vol surface renders in 3D
          across strike and expiry, with the current expiry’s smile alongside it
          carrying its butterfly and calendar arbitrage verdict. Click a tenor
          on the surface to switch the expiry the whole desk reads.
        </P>
        <P>
          Read it from the verdicts down. The smile’s arb pill is green only
          when both no-arbitrage checks pass (calendar: total variance
          non-decreasing in T; butterfly: Durrleman g(k) at least 0 across the
          strike grid). The oracle panel carries spot, forward, ATM IV, the
          vol-by-strike matrix, and the five raw SVI parameters. The vault panel
          leads with its sigma stress verdict, and the live tape merges mints
          and redeems newest-first with a running taker win rate, where under
          50% means the PLP vault has the edge. Watch the wireframe pulse
          cerulean on each fresh on-chain SVI update.
        </P>
        <DocLink href="/">Open Desk ↗</DocLink>
      </DocSection>

      <DocSection title="Vol Analytics">
        <P>
          Vol Analytics is the volatility desk in depth. It answers “what shape
          is the market pricing, and is that shape moving?“ The smile is plotted
          across log-moneyness, the skew and term structure are broken out with
          25-delta risk reversals and butterflies, and the risk-neutral density
          the surface prices is recovered via Breeden-Litzenberger and shown
          with a digital probability ladder.
        </P>
        <P>
          The 25-delta risk reversal is the headline directional gauge:
          negative means puts are bid, the normal BTC crash-fear regime. Forward
          vol exposes event risk between two tenors that a flat ATM curve hides,
          and goes blank when variance is not increasing across the window (a
          calendar arbitrage). The density’s tail shape flags a fat left tail
          when crash risk is priced richer than upside, and density
          non-negativity is exactly the butterfly condition, so it greens with
          the smile’s arb verdict. Smile dynamics measure whether the skew is
          rotating (vol points per hour) and how the SVI parameters drift over
          time.
        </P>
        <DocLink href="/vol">Open Vol Analytics ↗</DocLink>
      </DocSection>

      <DocSection title="Flow & Edge">
        <P>
          Flow & Edge is where the vault’s edge is made or lost. It answers “is
          the vault selling vol above fair, and is the market priced
          correctly?“ Every fill is scored against its model-fair price, the
          digital N(d_2) from that fill’s own live SVI smile and forward, to
          show the VRP captured fill by fill, in basis points and in dollars.
        </P>
        <P>
          The edge readout greens when the vault overcharged versus model fair
          and reds when takers got it cheap, premium-weighted over the window.
          The paid-vs-fair scatter plots every fill against the break-even
          diagonal (below it is vault edge), with dot size scaled by contract
          quantity. Calibration checks whether the price each side paid matches
          how often that side actually won, so a well-priced market sits on the
          diagonal and a gap flags systematically mis-priced UP or DN binaries.
          Whale flow ranks the largest mints by notional rather than count, and
          the range panel breaks out the vertical-spread product line that pays
          inside a strike band.
        </P>
        <DocLink href="/flow">Open Flow & Edge ↗</DocLink>
      </DocSection>

      <DocSection title="PLP Risk">
        <P>
          The vault is the counterparty to every position, so its solvency is
          the market’s solvency. This view reconstructs the open book from flow,
          marks every leg at fair value, and answers the LP’s real question:
          “is it safe to back this vault right now?“ It leads with one GREEN,
          AMBER, or RED grade, taken as the worst of utilization, max-payout
          utilization, top-expiry share, and exit ratio, exportable as a CSV or
          a printable one-pager.
        </P>
        <P>
          Read the grade, then read what drives it. MtM concentration is the HHI
          across expiries (at least 0.5 is concentrated, at most 0.25 is
          diversified), since a concentrated book blows up faster on one bad
          settlement. The breach sigma is the worst-direction shock the vault
          survives before LP equity is wiped, found by repricing the whole book
          through the SVI smile out to five sigma; the scenario curve crosses
          zero at that point. Exit capacity is the binding minimum of free
          liquidity and the withdrawal-limiter budget, so you can tell whether
          LPs can actually leave. When the verdict says the vault is safe to
          back, the connect-gated panel supplies or withdraws dUSDC in place
          with a real predict::supply or predict::withdraw, clamped to the live
          limiter budget and free liquidity.
        </P>
        <DocLink href="/risk">Open PLP Risk ↗</DocLink>
      </DocSection>

      <DocSection title="Managers">
        <P>
          Managers is the desk leaderboard. It answers “who is trading this
          market, and how are they doing?“ Every trading account is ranked by
          volume, with realized and unrealized PnL, account value, open
          exposure, and open positions, paginated and sortable, with
          drill-through to a per-desk page that shows that account’s equity
          curve. The header rolls up market-wide activity and your own PnL.
        </P>
        <P>
          The cohort is the highest-volume managers in the flow window, ranked
          by realized PnL, account value, or open exposure. Account value is
          the trading balance plus the mark value of open positions and any
          redeemable winnings; open exposure is the at-risk notional tied up in
          open positions right now. The market header counts total
          PredictManager accounts against the distinct managers active in the
          recent window, and nets vault premium in against settled payouts out.
        </P>
        <DocLink href="/managers">Open Managers ↗</DocLink>
      </DocSection>

      <DocSection title="Ops / Health">
        <P>
          Ops / Health is one read on whether the market is trustworthy right
          now. It answers “can I trust the numbers the rest of the desk is
          showing?“ Per-feed oracle freshness is checked against the staleness
          window, per-pipeline indexer lag against the chain head, and a single
          global verdict sits over the live data path. If a feed is stale or the
          indexer is behind, this is where it shows first.
        </P>
        <P>
          A feed is Active when fresh, Stale once it passes the 30s window the
          contract enforces (past which mints revert), and Pending when its
          expiry has passed but it has not settled. The global verdict reads
          HALTED if trading is paused by the on-chain kill-switch, else DEGRADED
          if any feed or pipeline is bad. Pipeline lag breaks out per-pipeline
          time and checkpoint lag behind the single aggregate lag the footer
          shows, with backfill pipelines excluded.
        </P>
        <DocLink href="/ops">Open Ops / Health ↗</DocLink>
      </DocSection>

      <DocSection title="Cross-Venue">
        <P>
          Cross-Venue puts on-chain volatility in context. It answers “is
          Predict rich or cheap against the rest of the market, and does selling
          vol carry an edge?“ Predict’s ATM vol is plotted against Deribit’s
          DVOL index per tenor, where a spread of at least two vol points flags
          an actionable cross-venue read: rich means sell Predict vol, cheap
          means buy it.
        </P>
        <P>
          The VRP is shown as Deribit implied vol minus Binance trailing
          realized vol, the spread that tells an LP whether selling vol carries
          an edge: positive means options are rich, the LP’s edge, and the
          shaded gap between the two lines is the premium sellers capture.
          Alongside it, a composability read frames the DeepBook stack itself,
          pricing the live margin borrow rate against the PLP supply yield
          across Predict, deepbook_margin, and DeepBook spot.
        </P>
        <DocLink href="/cross-venue">Open Cross-Venue ↗</DocLink>
      </DocSection>
    </DocArticle>
  );
}
