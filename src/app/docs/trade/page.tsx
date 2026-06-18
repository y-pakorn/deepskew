import type { Metadata } from "next";
import {
  Callout,
  Code,
  DocArticle,
  DocLink,
  DocSection,
  Step,
  Steps,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "Docs · Trade Binaries",
  description:
    "Buy and sell binary positions on DeepBook Predict from deepskew: connect, create and fund a PredictManager, read the model-fair N(d2), then mint and redeem on-chain. Mint signs predict::mint and debits the premium from your trading account; redeem signs predict::redeem and credits the payout.",
  alternates: { canonical: "/docs/trade" },
};

export default function TradeBinaries() {
  return (
    <DocArticle
      eyebrow="How-To"
      title="Trade Binaries"
      lead={
        <>
          DeepBook Predict is an options-style market: you buy a binary that pays
          $1 per contract if BTC finishes on the chosen side of a strike at
          expiry, and nothing if it does not. deepskew lets you trade it from the{" "}
          <DocLink href="/flow">Flow &amp; Edge</DocLink> view, leading with the
          model-fair <Code>N(d2)</Code> so you see what the position is worth
          before you sign. Trades run through a <Code>PredictManager</Code>, your
          own on-chain account that holds the dUSDC positions are bought from and
          paid into. This is the full path: connect, fund the account, read the
          fair value, buy, then redeem and withdraw.
        </>
      }
    >
      <DocSection title="Walkthrough">
        <Steps>
        <Step n={1} title="Connect a wallet">
          Use the Connect control at the top-right of the desk. deepskew reads
          balances and signs transactions through the connected Sui wallet, so
          nothing in this flow works until an account is attached.
        </Step>

        <Step n={2} title="Request Testnet dUSDC">
          The faucet is a{" "}
          <DocLink href="https://tally.so/r/Xx102L">Tally form</DocLink>. dUSDC is
          Predict’s quote asset, not the official Sui Testnet USDC, so the two are
          not interchangeable. You also need a little SUI in the same wallet to
          pay for gas.
        </Step>

        <Step n={3} title="Create a trading account">
          Open <DocLink href="/flow">Flow &amp; Edge</DocLink>, go to the{" "}
          <Code>Account</Code> tab, and choose Create trading account. This signs{" "}
          <Code>predict::create_manager</Code>, which creates and shares your
          PredictManager. It is a one-time setup and appears as your account a few
          seconds later, once the indexer picks up the on-chain event.
        </Step>

        <Step n={4} title="Fund the account">
          On the <Code>Account</Code> tab, Deposit dUSDC. This signs{" "}
          <Code>predict_manager::deposit</Code> and moves dUSDC from your wallet
          into the account. Buying spends from this account balance, not from your
          wallet directly; Withdraw on the same tab moves dUSDC back out.
        </Step>

        <Step n={5} title="Read the bet">
          On the <Code>Buy</Code> tab, pick a Direction (Up or Dn), a Strike (it
          defaults to at-the-money and snaps to the oracle’s on-chain strike grid),
          and a Max payout (what you win if it hits). The ticket leads with the
          model-fair <Code>N(d2)</Code> for that strike and side, and the order
          summary spells out the premium you pay, what you win, the max loss, and
          the time to expiry, before you sign.
        </Step>

        <Step n={6} title="Buy (mint)">
          Buy Up or Buy Dn signs <Code>predict::mint</Code>. It builds the{" "}
          <Code>MarketKey</Code> on-chain (
          <Code>market_key::new(oracle_id, expiry, strike, is_up)</Code>) and
          debits the premium from your account balance. When the button is
          disabled it names what is blocking it: connect a wallet, create an
          account, enter a size, add dUSDC, or the market is not live.
        </Step>

        <Step n={7} title="Sell or settle (redeem)">
          On the <Code>Sell</Code> tab, your open positions are listed with their
          mark value and unrealized PnL. Redeem signs <Code>predict::redeem</Code>:
          before expiry it pays the live bid, and once the oracle settles it pays
          $1 per contract if you were on the right side, 0 if not. The payout lands
          in your account balance.
        </Step>

        <Step n={8} title="Withdraw to your wallet">
          Back on the <Code>Account</Code> tab, Withdraw moves your account balance
          (anything unspent, plus winnings and settled payouts) back to your wallet
          via <Code>predict_manager::withdraw</Code>.
        </Step>

        <Step n={9} title="Confirm on-chain">
          Every step ends on a toast with the transaction digest and a Suiscan
          link, so the whole loop, create, deposit, mint, redeem, withdraw, is
          verifiable against the chain.
        </Step>
        </Steps>
      </DocSection>

      <Callout title="Where your dUSDC lives" tone="accent">
        Buying spends from your trading account, not your wallet. You fund the
        account from your wallet on the <Code>Account</Code> tab; premiums are
        debited from it, and winnings and settled payouts are credited back to it;
        you withdraw to your wallet whenever you like. Keeping every deduction in
        one place is what makes the order summary’s “from account” line exact.
      </Callout>

      <Callout title="The premium is a fair-value floor on Testnet" tone="warn">
        The premium is the live ask times your payout. While Predict’s
        pricing-config feed is unpublished on Testnet, deepskew shows the
        model-fair <Code>N(d2)</Code> as the floor and the contract applies the
        exact spread on-chain at mint, so what you actually pay can be a little
        higher than the estimate. The order summary marks it with a{" "}
        <Code>≈</Code> when it is estimated. See{" "}
        <DocLink href="/docs/integration">On-Chain Integration</DocLink> for the
        write path and <DocLink href="/docs/liquidity">Provide Liquidity</DocLink>{" "}
        for the LP side.
      </Callout>
    </DocArticle>
  );
}
