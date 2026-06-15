import type { Metadata } from "next";
import {
  Callout,
  Code,
  DocArticle,
  DocLink,
  DocSection,
  KeyVal,
  LI,
  P,
  UL,
} from "@/components/docs/doc-ui";
import {
  DEFAULT_ORACLE_ID,
  explorerObject,
  INDEXER_BASE_URL,
  PREDICT_ID,
  PREDICT_PACKAGE_ID,
  QUOTE_ASSET_DUSDC,
} from "@/lib/sui/constants";

export const metadata: Metadata = {
  title: "Docs · On-Chain Integration",
  description:
    "The objects, the read path, and the write path behind deepskew: the Predict package and market, the dUSDC quote, a three-tier read (REST indexer, event stream, gRPC core), and predict::supply / predict::withdraw signed through the dApp Kit.",
  alternates: { canonical: "/docs/integration" },
};

/** First 10 and last 6 hex chars of a Sui id, for compact link text. */
function truncate(id: string): string {
  const hex = id.startsWith("0x") ? id : `0x${id}`;
  return hex.length > 18 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex;
}

export default function IntegrationDoc() {
  return (
    <DocArticle
      eyebrow="Build"
      title="On-Chain Integration"
      lead={
        <>
          deepskew binds to a small set of on-chain identifiers, reads them
          through three tiers (a public REST indexer, an event stream, and direct
          gRPC), and writes back through exactly two contract calls. This page is
          the map: the objects, the read path, the write path, and where Predict
          sits in the wider DeepBook stack.
        </>
      }
    >
      <DocSection title="The Objects">
        <P>
          Everything deepskew touches resolves to one of four on-chain
          identifiers. These are Testnet values on the{" "}
          <Code>predict-testnet-4-16</Code> branch. The package id and quote
          asset should be re-resolved from the indexer&rsquo;s <Code>/config</Code>{" "}
          at runtime, and on Mainnet the single market id becomes a runtime list,
          but on Testnet they are stable enough to treat as constants.
        </P>
        <div className="rounded-lg border border-hairline bg-panel px-4 py-2">
          <KeyVal k="Predict package">
            <DocLink href={explorerObject(PREDICT_PACKAGE_ID)}>
              <span className="font-mono">{truncate(PREDICT_PACKAGE_ID)}</span>
            </DocLink>{" "}
            is the Predict Move package. Every call target (
            <Code>predict::supply</Code>, <Code>predict::withdraw</Code>,{" "}
            <Code>oracle::*</Code> events) lives under it.
          </KeyVal>
          <KeyVal k="Predict market">
            <DocLink href={explorerObject(PREDICT_ID)}>
              <span className="font-mono">{truncate(PREDICT_ID)}</span>
            </DocLink>{" "}
            is the shared market object. On Testnet there is exactly one, so all
            3.6k+ oracles report this single <Code>predict_id</Code>, and it is
            the first argument to both vault calls.
          </KeyVal>
          <KeyVal k="Default oracle">
            <DocLink href={explorerObject(DEFAULT_ORACLE_ID)}>
              <span className="font-mono">{truncate(DEFAULT_ORACLE_ID)}</span>
            </DocLink>{" "}
            is the headline oracle the desk opens on: one rolling BTC expiry
            publishing spot, forward, and SVI params.
          </KeyVal>
          <KeyVal k="dUSDC quote">
            <DocLink href={explorerObject(QUOTE_ASSET_DUSDC.split("::")[0])}>
              <span className="font-mono">
                {truncate(QUOTE_ASSET_DUSDC.split("::")[0])}::dusdc::DUSDC
              </span>
            </DocLink>{" "}
            is the accepted quote asset. It is dUSDC, the Predict Testnet token,
            not the official Testnet USDC.
          </KeyVal>
        </div>
        <Callout title="Verify any of these" tone="accent">
          Every value above links to Suiscan Testnet through{" "}
          <Code>explorerObject(id)</Code>. The link text is truncated, but the
          link target carries the full id, so you can open the real object and
          confirm it yourself.
        </Callout>
      </DocSection>

      <DocSection title="The Read Path">
        <P>
          deepskew reads chain state through three tiers, each chosen for what it
          is best at. They layer: the indexer answers most questions, the event
          stream supplies freshness, and gRPC fills the gaps the indexer cannot.
        </P>
        <UL>
          <LI>
            <strong className="text-text-sec">Tier 1: the REST indexer.</strong>{" "}
            The public Predict indexer at{" "}
            <DocLink href={INDEXER_BASE_URL}>
              <span className="font-mono">{INDEXER_BASE_URL}</span>
            </DocLink>{" "}
            serves <Code>/config</Code>, <Code>/oracles</Code>, fills, and vault
            state. CORS is open, so the browser calls it directly with no proxy.
            This is the bulk read: the surface, the smile, and the tape all start
            here.
          </LI>
          <LI>
            <strong className="text-text-sec">
              Tier 2: the checkpoint / event stream.
            </strong>{" "}
            Oracle events (<Code>OraclePricesUpdated</Code>,{" "}
            <Code>OracleSVIUpdated</Code>, <Code>OracleSettled</Code>,{" "}
            <Code>OracleActivated</Code>, all under{" "}
            <Code>{`${"<package>"}::oracle`}</Code>) give per-tick freshness. The
            cerulean pulse on each oracle update is this tier landing in the UI.
          </LI>
          <LI>
            <strong className="text-text-sec">
              Tier 3: direct gRPC <Code>client.core</Code> reads.
            </strong>{" "}
            For wallet-side state the indexer does not hold, deepskew reads the
            Sui 2.x Core API directly, for example{" "}
            <Code>client.core.listCoins({"{ owner, coinType }"})</Code> to
            enumerate dUSDC and PLP coins. This is DeepBook&rsquo;s prescribed
            shape: a structural <Code>CoinReader</Code> over{" "}
            <Code>core</Code>, paginated by cursor.
          </LI>
        </UL>
      </DocSection>

      <DocSection title="The Write Path">
        <P>
          deepskew calls the contract in exactly one place: the PLP vault. Two
          targets cover it, both generic over the quote type and both taking the
          shared <Code>Clock</Code> (<Code>0x6</Code>) as their last argument.
        </P>
        <UL>
          <LI>
            <Code>predict::supply&lt;Quote&gt;(predict, Coin&lt;Quote&gt;, clock)</Code>{" "}
            mints LP shares: it deposits dUSDC and returns a{" "}
            <Code>Coin&lt;PLP&gt;</Code> transferred to the sender.
          </LI>
          <LI>
            <Code>predict::withdraw&lt;Quote&gt;(predict, Coin&lt;PLP&gt;, clock)</Code>{" "}
            burns LP shares: it spends a <Code>Coin&lt;PLP&gt;</Code> and returns{" "}
            <Code>Coin&lt;Quote&gt;</Code> to the sender.
          </LI>
        </UL>
        <P>
          Both are built as a single <Code>Transaction</Code> (coins
          consolidated, then split to the exact amount) and signed through the
          dApp Kit&rsquo;s <Code>signAndExecuteTransaction</Code>. The market id
          is the first argument; the package id is the call target.
        </P>
        <Callout title="The withdrawal limiter is a throughput cap, not a lock" tone="warn">
          Withdrawals are bounded on-chain by two things at once. There is a
          solvency floor (<Code>balance − max_payout</Code>) and a token-bucket
          rate limiter: not a fixed timed lock, but a continuously refilling
          throughput cap on how fast the vault can be drained. So a withdrawal
          binds to <Code>min(available_liquidity, available_withdrawal)</Code>,
          and the UI clamps the input to that live budget rather than letting a
          transaction fail at the floor.
        </Callout>
      </DocSection>

      <DocSection title="Composability">
        <P>
          Predict does not sit alone. It is one product in the DeepBook stack,
          and deepskew reads the other two legs to frame the borrow-and-supply
          loop a leveraged liquidity provider would run.
        </P>
        <UL>
          <LI>
            <strong className="text-text-sec">DeepBook v3 spot.</strong> The
            on-chain CLOB venue Predict&rsquo;s oracle prices against. deepskew
            reads <Code>/summary</Code> and picks the BTC/USDC pair, so the spot
            price the surface settles toward is shown next to the surface itself.
          </LI>
          <LI>
            <strong className="text-text-sec">deepbook_margin.</strong> The
            borrow leg. deepskew reads <Code>/margin_pool_created</Code> for the
            dUSDC pool&rsquo;s interest config and computes the kinked two-slope
            borrow APR at the current utilization, the cost side of funding a
            leveraged PLP position.
          </LI>
        </UL>
        <P>
          Both DeepBook indexers share the same Testnet host with open CORS, so
          they are called straight from the browser exactly like the Predict
          indexer. Together they close the loop: borrow dUSDC on margin, supply
          it to the PLP vault, and earn the vault&rsquo;s edge against the borrow
          rate.
        </P>
        <Callout title="See it live" tone="accent">
          The full loop, with the spot reference, the borrow APR, and the PLP
          edge side by side, is on the{" "}
          <DocLink href="/cross-venue">Cross-Venue</DocLink> view. To put dUSDC
          into the vault yourself, see{" "}
          <DocLink href="/docs/liquidity">Provide Liquidity</DocLink>.
        </Callout>
      </DocSection>
    </DocArticle>
  );
}
