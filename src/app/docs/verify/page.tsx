import type { Metadata } from "next";
import {
  Callout,
  DocArticle,
  DocLink,
  DocSection,
  KeyVal,
  LI,
  P,
  SourceChip,
  Step,
  Steps,
  UL,
} from "@/components/docs/doc-ui";
import {
  DEFAULT_ORACLE_ID,
  PREDICT_ID,
  PREDICT_PACKAGE_ID,
} from "@/lib/sui/constants";

export const metadata: Metadata = {
  title: "Docs · Verify It's Real",
  description:
    "Every figure in deepskew is computed from current on-chain state and every figure is checkable: live oracle ticks, fills and settlements that link to Suiscan, linkable source objects, and open math in src/lib.",
  alternates: { canonical: "/docs/verify" },
};

export default function DocsVerify() {
  return (
    <DocArticle
      eyebrow="Trust"
      title="Verify It's Real"
      lead={
        <>
          deepskew makes a strong claim: nothing on screen is sampled, mocked, or
          decorative. Every number is computed from current on-chain state, and
          every number is checkable against the chain. Here is how to confirm
          that for yourself, in about a minute.
        </>
      }
    >
      <DocSection title="Verify in 60 Seconds">
        <Steps>
        <Step n={1} title="Open the desk">
          The terminal is the root route. It loads the live volatility surface,
          the oracle, the PLP vault, and a tape of mints and redeems for the
          active Predict market.
        </Step>
        <Step n={2} title="Watch the cerulean pulse on each oracle tick">
          Every time the oracle publishes a new tick the readout pulses
          cerulean. That pulse is a real state change arriving from the chain,
          not an animation loop. The data is live, not mocked.
        </Step>
        <Step n={3} title="Click any settlement or fill row">
          Each settlement and fill row opens its transaction on Suiscan, so you
          can read the on-chain event that produced the number you just saw.
        </Step>
        <Step n={4} title="Open the Sources menu in the status bar">
          The status bar Sources menu links the Predict package, the Predict
          market, and the active oracle, each straight to its object on Suiscan.
        </Step>
        <Step n={5} title="Read the formula behind any number">
          Hover a value for the formula inline via its tooltip, or open the
          Glossary to read the same math typeset, with a pointer to where it is
          computed.
        </Step>
        </Steps>
      </DocSection>

      <DocSection title="What's Verifiable">
        <P>
          The claim is not that the numbers look plausible. It is that each one
          traces back to a public source you can open.
        </P>
        <UL>
          <LI>
            The desk reads live on-chain state. Nothing is sampled or mocked.
          </LI>
          <LI>
            Every fill and settlement links to its transaction on Suiscan.
          </LI>
          <LI>
            The Predict package and the source objects are linkable to their
            Suiscan pages.
          </LI>
          <LI>
            The math is open in{" "}
            <code className="font-mono text-text-sec">src/lib</code> and
            documented in{" "}
            <DocLink href="/docs/math">Methodology</DocLink>.
          </LI>
          <LI>The repository is public.</LI>
        </UL>
      </DocSection>

      <DocSection title="Sources">
        <P>
          These are the exact Testnet identifiers the desk reads from. Each one
          opens its object on Suiscan.
        </P>
        <div className="rounded-md border border-hairline bg-panel px-4 py-1">
          <KeyVal k="Predict package">
            <SourceChip id={PREDICT_PACKAGE_ID} />
          </KeyVal>
          <KeyVal k="Predict market">
            <SourceChip id={PREDICT_ID} />
          </KeyVal>
          <KeyVal k="Default oracle">
            <SourceChip id={DEFAULT_ORACLE_ID} />
          </KeyVal>
        </div>
        <Callout title="Nothing on screen is unverifiable" tone="accent">
          Every figure is computed from current on-chain state, and every figure
          is checkable: open the source objects above, click any fill or
          settlement to its transaction, read the math in{" "}
          <DocLink href="/docs/math">Methodology</DocLink>, and look up any term
          in the <DocLink href="/docs/glossary">Glossary</DocLink>.
        </Callout>
      </DocSection>
    </DocArticle>
  );
}
