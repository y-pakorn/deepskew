import type { Metadata } from "next";
import {
  Callout,
  DocArticle,
  DocLink,
  DocSection,
  LI,
  P,
  UL,
} from "@/components/docs/doc-ui";
import { Formula, InlineMath } from "@/components/docs/math";

export const metadata: Metadata = {
  title: "Docs · Methodology",
  description:
    "The volatility and risk math behind deepskew, typeset: the raw-SVI surface, the Durrleman butterfly and calendar arbitrage checks, digital pricing via N(d_2), the Breeden-Litzenberger risk-neutral density, 25-delta skew metrics, the vault breach-sigma scenario engine, and the vol-risk-premium.",
  alternates: { canonical: "/docs/math" },
};

export default function DocsMath() {
  return (
    <DocArticle
      eyebrow="Math"
      title="Methodology"
      lead={
        <>
          Every number on the desk is computed from on-chain state with the math
          below. Each formula is typeset exactly as it runs, with a pointer to
          the source file it lives in, so you can read the model and then read
          the code.
        </>
      }
    >
      <DocSection title="SVI Surface">
        <P>
          deepskew fits each expiry with the raw Stochastic-Volatility-Inspired
          parameterization of Gatheral and Jacquier (2014). Five numbers (
          <InlineMath tex="a, b, \rho, m, \sigma" />) define total variance{" "}
          <InlineMath tex="w(k)" /> as a function of log-moneyness{" "}
          <InlineMath tex="k = \ln(K/F)" />, and IV follows by annualizing over
          time-to-expiry <InlineMath tex="T" /> in years.
        </P>
        <Formula
          name="Total variance"
          tex="w(k)=a+b\big(\rho(k-m)+\sqrt{(k-m)^2+\sigma^2}\big)"
          where="src/lib/svi.ts"
        >
          The on-chain SVI smile in total-variance space, the object every
          downstream metric reads off.
        </Formula>
        <Formula
          name="Implied volatility"
          tex="\text{IV}(k)=\sqrt{w(k)/T},\quad k=\ln(K/F)"
          where="src/lib/svi.ts"
        >
          Annualized implied vol at strike <InlineMath tex="K" />, recovered from
          the total variance and the time-to-expiry.
        </Formula>
        <P>
          The fixed-point integers from the indexer are decoded into floats in{" "}
          <DocLink href="/docs/integration">decodeSvi</DocLink>; the analytic
          first and second derivatives <InlineMath tex="w'(k)" /> and{" "}
          <InlineMath tex="w''(k)" /> feed the arbitrage and density math below.
        </P>
      </DocSection>

      <DocSection title="Arbitrage-Free Checks">
        <P>
          A surface is shown green only when it leaves no risk-free money on the
          table. Two conditions are sampled across the log-moneyness grid: a
          butterfly check on each slice and a calendar check across the term
          structure.
        </P>
        <Formula
          name="Durrleman butterfly condition"
          tex="g(k)=\Big(1-\tfrac{k\,w'}{2w}\Big)^2-\tfrac{w'^2}{4}\Big(\tfrac1w+\tfrac14\Big)+\tfrac{w''}{2}"
          where="src/lib/svi.ts"
        >
          The slice is butterfly-arbitrage-free if and only if{" "}
          <InlineMath tex="g(k)\ge 0" /> for every sampled{" "}
          <InlineMath tex="k" />; one negative point flags an impossible negative
          implied density.
        </Formula>
        <Formula
          name="Calendar condition"
          tex="w_{T_2}(k)\ge w_{T_1}(k)\quad (T_2>T_1)"
          where="src/lib/svi.ts"
        >
          Total variance must be non-decreasing in <InlineMath tex="T" /> at
          fixed <InlineMath tex="k" />; a longer-dated tenor priced cheaper in
          variance than a nearer one is a calendar arbitrage.
        </Formula>
        <P>
          <code className="font-mono text-text-sec">checkButterfly</code> scans{" "}
          <InlineMath tex="g(k)" /> over the grid and returns the minimum and any
          violations; <code className="font-mono text-text-sec">checkCalendar</code>{" "}
          sorts the slices by <InlineMath tex="T" /> and counts crossings between
          adjacent tenors.
        </P>
      </DocSection>

      <DocSection title="Digital Pricing">
        <P>
          The keystone of the desk: an SVI smile is a continuum of binary prices.
          The model-fair value of an UP binary at strike <InlineMath tex="K" />{" "}
          (paying 1 above <InlineMath tex="K" />, 0 below) is the risk-neutral
          probability the underlying finishes above it, a pure function of{" "}
          <InlineMath tex="k" /> and the params. Every on-chain mint is scored
          against this.
        </P>
        <Formula
          name="Up-binary fair value"
          tex="P(S_T > K)=\Phi(d_2),\quad d_2=-\tfrac{k}{\sqrt{w}}-\tfrac{\sqrt{w}}{2}"
          where="src/lib/svi.ts"
        >
          Here <InlineMath tex="w=\sigma^2 T" /> is total variance and{" "}
          <InlineMath tex="\Phi" /> is the standard normal CDF, so no separate{" "}
          <InlineMath tex="T" /> is needed. The down side is{" "}
          <InlineMath tex="1-\Phi(d_2)" />.
        </Formula>
        <Formula
          name="Call delta (for delta strikes)"
          tex="\Delta_c=\Phi(d_1),\quad d_1=-\tfrac{k}{\sqrt{w}}+\tfrac{\sqrt{w}}{2}"
          where="src/lib/svi.ts"
        >
          The Black-Scholes-style call delta under the smile&rsquo;s local
          variance, inverted by bisection to locate the 25-delta strikes used by
          the skew metrics.
        </Formula>
      </DocSection>

      <DocSection title="Risk-Neutral Density">
        <P>
          One SVI slice implies a full distribution of where the market prices
          the underlying ending at expiry, recovered via Breeden-Litzenberger as
          presented by Gatheral in <em>The Volatility Surface</em>. It is the
          whole shape, not a single number.
        </P>
        <Formula
          name="Implied density of the log-return"
          tex="q(k)=\tfrac{g(k)}{\sqrt{2\pi\,w(k)}}\,e^{-d_-(k)^2/2},\quad d_-=-\tfrac{k}{\sqrt w}-\tfrac{\sqrt w}{2}"
          where="src/lib/svi.ts"
        >
          The density of <InlineMath tex="x=\ln(S_T/F)" /> in terms of
          Durrleman&rsquo;s <InlineMath tex="g(k)" />, sampled across the grid and
          normalized numerically to integrate to 1.
        </Formula>
        <Formula
          name="Density non-negativity"
          tex="q(k)\ge 0 \iff g(k)\ge 0"
          where="src/lib/svi.ts"
        >
          Because <InlineMath tex="g(k)" /> appears in the numerator, a valid
          probability density never going negative is exactly the butterfly
          condition on the smile.
        </Formula>
      </DocSection>

      <DocSection title="Skew Metrics">
        <P>
          The headline directional-skew gauges, in vol points. The 25-delta call
          and put strikes are solved off the smile by inverting{" "}
          <InlineMath tex="N(d_1)" />, then their IVs are differenced.
        </P>
        <Formula
          name="25-delta risk reversal"
          tex="\text{RR}_{25}=\text{IV}(25\Delta\,\text{call})-\text{IV}(25\Delta\,\text{put})"
          where="src/lib/svi.ts"
        >
          How much richer 25-delta calls are than 25-delta puts; negative is puts
          bid, the normal BTC crash-fear regime.
        </Formula>
        <Formula
          name="25-delta butterfly"
          tex="\text{BF}_{25}=\tfrac12\big(\text{IV}_c+\text{IV}_p\big)-\text{IV}_{\text{atm}}"
          where="src/lib/svi.ts"
        >
          How far the 25-delta wings sit above ATM, a measure of how convex
          (fat-tailed) the smile is.
        </Formula>
        <Formula
          name="Forward (between-expiry) vol"
          tex="\sigma_{\text{fwd}}=\sqrt{\tfrac{w_2-w_1}{T_2-T_1}}"
          where="src/lib/svi.ts"
        >
          The vol priced for the window between two tenors, from their ATM total
          variance <InlineMath tex="w=w(0)" />; blank when variance is not
          increasing (calendar arbitrage in the window).
        </Formula>
        <Formula
          name="Implied move"
          tex="\pm\,\sigma_{\text{ATM}}\sqrt{T}"
          where="src/lib/svi.ts"
        >
          The 1-sigma move the market prices into this expiry, the
          straddle-width breakeven, as a fraction of the forward.
        </Formula>
      </DocSection>

      <DocSection title="Vault">
        <P>
          The PLP vault is the counterparty to every position. The open book is
          reconstructed per (oracle, strike, side) from minted minus redeemed
          flow, marked at the model-fair <InlineMath tex="\Phi(d_2)" />, then
          aggregated into edge, concentration, and a stress scenario.
        </P>
        <Formula
          name="Vault edge per fill"
          tex="\text{edge}=\text{paid}-\Phi(d_2),\quad d_2=-\tfrac{k}{\sqrt w}-\tfrac{\sqrt w}{2}"
          where="src/lib/analytics.ts"
        >
          What the taker paid minus model fair, per fill, using each fill&rsquo;s
          own oracle SVI and forward; positive means the vault overcharged.
        </Formula>
        <Formula
          name="MtM concentration (HHI)"
          tex="\text{HHI}=\textstyle\sum_i s_i^2,\quad s_i=\tfrac{\text{liability}_i}{\sum\text{liability}}"
          where="src/lib/analytics.ts"
        >
          The Herfindahl-Hirschman index of marked liability across expiries:{" "}
          <InlineMath tex="\ge 0.5" /> is concentrated,{" "}
          <InlineMath tex="\le 0.25" /> diversified.
        </Formula>
        <Formula
          name="Breach sigma"
          tex="\sigma_{\text{breach}}=\min\{|n|:\text{vaultValue}(n)\le 0\}"
          where="src/lib/analytics.ts"
        >
          The worst-direction shock the vault survives before LP equity is wiped.
          The forward is shocked to <InlineMath tex="F\,e^{n\sigma_T}" /> per
          oracle with the smile held fixed, and the change in marked liability is
          applied to the live vault value.
        </Formula>
        <Callout title="Reconstruction caveat" tone="warn">
          The book is rebuilt from the indexer flow window and marked at the
          client&rsquo;s <InlineMath tex="\Phi(d_2)" />, while the contract uses
          its cached matrix MtM. The two should track, but the reconstruction is
          an estimate bounded by the flow window. See{" "}
          <DocLink href="/docs/views#vault">Vault</DocLink>.
        </Callout>
      </DocSection>

      <DocSection title="Vol-Risk-Premium">
        <P>
          What option sellers earn for bearing risk, the LP&rsquo;s edge. The
          desk reads it two ways: against an external reference, and as realized
          dollars harvested on-chain.
        </P>
        <Formula
          name="Vol-risk-premium"
          tex="\text{VRP}=\sigma_{\text{implied}}-\sigma_{\text{realized}}"
          where="src/lib/cross-venue.ts"
        >
          Implied vol minus trailing realized vol (Binance hourly closes,
          annualized). Positive means options are rich, the LP&rsquo;s edge.
        </Formula>
        <Formula
          name="Realized vol-risk-premium captured"
          tex="\textstyle\sum_i (\text{paid}_i-\text{fair}_i)\cdot q_i"
          where="src/lib/analytics.ts"
        >
          Cumulative signed dollar edge across the fill window, positive when the
          book was sold above model fair. The on-chain counterpart to the VRP
          spread above.
        </Formula>
        <P>
          The cross-venue reference is the only out-of-protocol data the terminal
          touches: Deribit&rsquo;s BTC DVOL index for implied and Binance{" "}
          <code className="font-mono text-text-sec">BTCUSDT</code> klines for
          realized. Both send open CORS and are called straight from the browser.
        </P>
        <UL>
          <LI>
            Implied reference: Deribit BTC DVOL, hourly, last 7 days.
          </LI>
          <LI>
            Realized: annualized stdev of Binance hourly log returns over a
            rolling window.
          </LI>
        </UL>
      </DocSection>
    </DocArticle>
  );
}
