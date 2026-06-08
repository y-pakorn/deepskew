import type { Metadata } from "next";
import {
  Callout,
  Code,
  DocArticle,
  DocLink,
  DocSection,
  Step,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "Docs · Provide Liquidity",
  description:
    "Connect a wallet, fund it with testnet dUSDC, read the PLP vault's risk grade, then supply or withdraw on-chain. Supply signs predict::supply and returns Coin<PLP>; withdraw burns PLP for dUSDC, clamped to the live withdrawable budget.",
  alternates: { canonical: "/docs/liquidity" },
};

export default function ProvideLiquidity() {
  return (
    <DocArticle
      eyebrow="How-To"
      title="Provide Liquidity"
      lead={
        <>
          The PLP vault is the counterparty to every Predict position, and it is
          the one place deepskew writes to the chain. Supplying mints LP shares
          against the vault; withdrawing burns them back to dUSDC. This is the
          full path: connect, fund, read the risk, and act.
        </>
      }
    >
      <DocSection title="Walkthrough">
        <Step n={1} title="Connect a wallet">
          Use the Connect control at the top-right of the desk. deepskew reads
          balances and signs transactions through the connected Sui wallet, so
          nothing in this flow works until an account is attached.
        </Step>

        <Step n={2} title="Request testnet dUSDC">
          The faucet is a{" "}
          <DocLink href="https://tally.so/r/Xx102L">Tally form</DocLink>. Note
          that dUSDC is the vault’s quote asset, not the official Sui testnet
          USDC, so the two are not interchangeable. You also need a little SUI in
          the same wallet to pay for gas.
        </Step>

        <Step n={3} title="Read the risk grade first">
          Open <DocLink href="/risk">PLP Risk</DocLink>. The Provide liquidity
          panel leads with the live solvency verdict, a <Code>Green</Code> /{" "}
          <Code>Amber</Code> / <Code>Red</Code> grade off the vault’s utilization,
          max-payout utilization, and exit ratio. Read the verdict before you
          decide whether to back the vault.
        </Step>

        <Step n={4} title="Supply">
          Enter a dUSDC amount. The panel quotes the PLP share price and the
          estimated PLP shares you receive. Supply signs a real{" "}
          <Code>predict::supply</Code>, consolidating your dUSDC coins, splitting
          the input, and transferring the minted <Code>Coin&lt;PLP&gt;</Code>{" "}
          back to your wallet.
        </Step>

        <Step n={5} title="Withdraw">
          Switch to Withdraw and enter a dUSDC-out amount. Withdraw burns{" "}
          <Code>Coin&lt;PLP&gt;</Code> via <Code>predict::withdraw</Code> and
          returns dUSDC. The amount is clamped to your share value and to the
          live withdrawable budget, the smaller of available liquidity and the
          rate-limiter cap, so it never asks the chain for more than it can pay
          right now.
        </Step>

        <Step n={6} title="Confirm on-chain">
          On success a toast confirms the amount and surfaces the transaction
          digest with a Suiscan link, so every supply and withdraw is verifiable
          against the chain.
        </Step>
      </DocSection>

      <Callout title="The withdrawal limiter" tone="warn">
        Withdrawals are bounded on-chain by a token-bucket rate limiter that
        refills continuously. There is no fixed lock and no cooldown timer, so
        you can withdraw any time, but a single withdrawal larger than the
        current budget is rejected. The panel shows that budget live and clamps
        the input to it. If the budget reads “Off”, the limiter is disabled and
        available liquidity is the only bind. See{" "}
        <DocLink href="/risk">PLP Risk</DocLink> for the exit-capacity read and{" "}
        <DocLink href="/docs/integration">On-Chain Integration</DocLink> for the
        write path.
      </Callout>
    </DocArticle>
  );
}
