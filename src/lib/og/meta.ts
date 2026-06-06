/**
 * Per-route copy for the social cards and page metadata. One source of truth so
 * the OG/Twitter image, the `<title>` and the meta description never drift.
 *
 * `nav` is the active-view label shown in the card's command strip (matches the
 * desk nav). `title` is the large hero line, and `description` doubles as the
 * route's meta description for search and link previews.
 */

export type OgRouteKey =
  | "desk"
  | "vol"
  | "flow"
  | "risk"
  | "managers"
  | "ops"
  | "cross-venue";

export interface OgRouteMeta {
  nav: string;
  title: string;
  description: string;
}

export const OG_ROUTES: Record<OgRouteKey, OgRouteMeta> = {
  desk: {
    nav: "Desk",
    title: "Make Predict legible",
    description:
      "One screen for DeepBook Predict on Sui. The live BTC implied-volatility surface, a continuous arbitrage-free check, the vault risk out to five sigma, and the settlement tape, each leading with a verdict.",
  },
  vol: {
    nav: "Vol Analytics",
    title: "Vol Analytics",
    description:
      "The BTC volatility smile, skew and term structure, the risk-neutral density the surface implies, and how the skew rotates through time. Reconstructed from on-chain SVI parameters.",
  },
  flow: {
    nav: "Flow & Edge",
    title: "Flow & Edge",
    description:
      "Every fill scored against fair value. The vol-risk-premium the vault captures, settlement calibration, whale flow by notional, and range-product flow.",
  },
  risk: {
    nav: "PLP Risk",
    title: "PLP Risk",
    description:
      "The PLP vault underwrites every position, so its solvency is the market's. Concentration, the breach point out to five sigma, drawdown replay, exit capacity, and one GREEN, AMBER or RED grade for LPs.",
  },
  managers: {
    nav: "Managers",
    title: "Managers",
    description:
      "The desk leaderboard for DeepBook Predict. Realized and unrealized PnL, open exposure and volume, ranked across every trading account.",
  },
  ops: {
    nav: "Ops / Health",
    title: "Ops / Health",
    description:
      "A single read on whether the market is healthy. Oracle feed freshness and indexer pipeline lag across the live data path, resolved to one verdict.",
  },
  "cross-venue": {
    nav: "Cross-Venue",
    title: "Cross-Venue",
    description:
      "Predict ATM volatility against Deribit DVOL, and the vol-risk-premium versus Binance realized. Where on-chain volatility sits rich or cheap.",
  },
};

/** The static routes that carry a bespoke card (and belong in the sitemap). */
export const OG_ROUTE_PATHS: Record<Exclude<OgRouteKey, "desk">, string> = {
  vol: "/vol",
  flow: "/flow",
  risk: "/risk",
  managers: "/managers",
  ops: "/ops",
  "cross-venue": "/cross-venue",
};
