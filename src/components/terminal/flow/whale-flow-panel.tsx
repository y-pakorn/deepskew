"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActiveOracleMarks, useBookFlow } from "@/lib/indexer/hooks";
import { fmtPrice, fmtUsdCompact, fromUnits, utcClock } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { Hero, StatTile, TileGrid } from "../stat";
import { LabelTip } from "../label-tip";
import {
  LightCard,
  LightFigures,
  LightLede,
  LightNote,
  LightSubLabel,
  Num,
} from "../light";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";
import { TxRow } from "../tx-row";

/** Whale flow + mint/redeem momentum, weighted by NOTIONAL (not count, the way
 *  the count-based OI histogram under-weights size). Leads with net directional
 *  premium — is fresh risk being opened, and which way? */
export function WhaleFlowPanel({ className }: { className?: string }) {
  const account = useCurrentAccount();
  const { mints, redeems, isLoading, isError } = useBookFlow(500);
  const { marks } = useActiveOracleMarks();

  const m = useMemo(() => {
    const up = mints.filter((x) => x.is_up).reduce((s, x) => s + x.cost, 0);
    const dn = mints.filter((x) => !x.is_up).reduce((s, x) => s + x.cost, 0);
    const mintPrem = up + dn;
    const redeemPay = redeems.reduce((s, x) => s + x.payout, 0);
    const whales = [...mints].sort((a, b) => b.cost - a.cost).slice(0, 30);
    return {
      up,
      dn,
      net: up - dn,
      upPct: mintPrem > 0 ? (up / mintPrem) * 100 : 50,
      mintPrem,
      redeemPay,
      whales,
    };
  }, [mints, redeems]);

  return (
    <Panel
      title="Whale Flow"
      code="Notional · momentum"
      className={className}
      bodyClassName="flex flex-col overflow-hidden p-0"
      right={
        <span className="label-micro text-text-faint">
          {mints.length ? (
            <>
              <span className="tabular">{mints.length}</span> mints
            </>
          ) : (
            "Live"
          )}
        </span>
      }
      light={
        !isError && !!mints.length && m.mintPrem > 0 ? (
          <LightCard>
            <LightLede>
              Big money is leaning{" "}
              {m.net >= 0 ? (
                <Num tone="safe">up</Num>
              ) : (
                <Num tone="breach">down</Num>
              )}{" "}
              right now, with <Num>{m.upPct.toFixed(0)}%</Num> of fresh bets
              going up and{" "}
              {m.mintPrem >= m.redeemPay ? (
                <>new bets being <Num>opened</Num></>
              ) : (
                <>old bets being <Num>closed</Num></>
              )}
              .
            </LightLede>
            <div className="shrink-0">
              <LightSubLabel tip="notional-positioning">
                Which way the big bets lean
              </LightSubLabel>
              <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-breach/30">
                <div
                  className="h-full bg-safe"
                  style={{ width: `${m.upPct}%` }}
                />
              </div>
            </div>
            <div className="shrink-0">
              <LightSubLabel tip="whale-flow">Biggest recent bets</LightSubLabel>
              <div className="mt-1.5">
                {m.whales.slice(0, 6).map((w, i) => (
                  <TxRow
                    key={`light:${w.digest}:${i}`}
                    digest={w.digest}
                    className={cn(
                      "grid grid-cols-[2.6rem_1fr_auto] items-center gap-x-2 border-b border-hairline/40 px-0 py-1 text-data tabular last:border-b-0",
                      account &&
                        account.address === w.trader &&
                        "bg-accent-brand/10",
                    )}
                  >
                    <span className={w.is_up ? "text-safe" : "text-breach"}>
                      {w.is_up ? "UP▲" : "DN▼"}
                    </span>
                    <span className="truncate text-text-sec">
                      {fmtPrice(w.strike)}
                    </span>
                    <span className="text-right text-text-dim">
                      {fmtUsdCompact(fromUnits(w.cost, DUSDC_DECIMALS))}
                    </span>
                  </TxRow>
                ))}
              </div>
            </div>
            <LightFigures
              items={[
                {
                  label: "Net flow",
                  value: `${fmtUsdCompact(
                    fromUnits(Math.abs(m.net), DUSDC_DECIMALS),
                  )} ${m.net >= 0 ? "up" : "down"}`,
                  tone: m.net >= 0 ? "safe" : "breach",
                  tip: "net-flow",
                },
                {
                  label: "Share up",
                  value: `${m.upPct.toFixed(0)}%`,
                  tip: "notional-positioning",
                },
                {
                  label: "Opening vs closing",
                  value: m.mintPrem >= m.redeemPay ? "Opening" : "Closing",
                  tip: "mint-redeem-momentum",
                },
              ]}
            />
            <LightNote>
              Counted by bet size, not by number of bets, so one whale outweighs
              many small bets. Each row links to the trade on-chain.
            </LightNote>
          </LightCard>
        ) : null
      }
    >
      {isError ? (
        <PanelState kind="error">Flow feed unreachable</PanelState>
      ) : isLoading && !mints.length ? (
        <PanelState kind="empty">Loading flow…</PanelState>
      ) : !mints.length ? (
        <PanelState kind="empty">No recent flow</PanelState>
      ) : (
        <>
          <div className="border-b border-hairline p-3">
            <Hero
              label="Net directional flow"
              tip="net-flow"
              tone={m.net >= 0 ? "safe" : "breach"}
              value={`${fmtUsdCompact(
                fromUnits(Math.abs(m.net), DUSDC_DECIMALS),
              )} ${m.net >= 0 ? "UP" : "DN"}`}
              sub={
                <>
                  Notional-weighted ·{" "}
                  {m.mintPrem >= m.redeemPay ? "risk opening" : "unwinding"} ·{" "}
                  {m.upPct.toFixed(0)}% UP
                </>
              }
            />

            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between">
                <LabelTip k="notional-positioning" className="label-micro">
                  Positioning · by notional
                </LabelTip>
                <span className="text-data tabular text-text-dim">
                  {m.upPct.toFixed(0)}% UP
                </span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-breach/30">
                <div
                  className="h-full bg-safe"
                  style={{ width: `${m.upPct}%` }}
                />
              </div>
            </div>

            <TileGrid cols={2} className="mt-3">
              <StatTile
                label="Mint premium"
                tip="mint-redeem-momentum"
                value={fmtUsdCompact(fromUnits(m.mintPrem, DUSDC_DECIMALS))}
                tone="safe"
              />
              <StatTile
                label="Redeem payout"
                tip="mint-redeem-momentum"
                value={fmtUsdCompact(fromUnits(m.redeemPay, DUSDC_DECIMALS))}
                tone="dim"
              />
            </TileGrid>
          </div>

          <div className="grid grid-cols-[2.6rem_1fr_3.5rem_auto] items-center gap-x-2 border-b border-hairline px-3 py-1.5">
            <LabelTip k="flow-side-glyph" className="label-micro">
              Side
            </LabelTip>
            <span className="label-micro">Strike</span>
            <span className="label-micro text-right">Time</span>
            <LabelTip k="whale-flow" className="label-micro ml-auto w-fit">
              Premium
            </LabelTip>
          </div>
          <ScrollArea className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)]">
            {m.whales.map((w, i) => {
              const mark = marks.get(w.oracle_id);
              const mny =
                mark && mark.forward > 0 ? w.strike / mark.forward - 1 : null;
              return (
                <TxRow
                  key={`${w.digest}:${i}`}
                  digest={w.digest}
                  className={cn(
                    "grid grid-cols-[2.6rem_1fr_3.5rem_auto] items-center gap-x-2 border-b border-hairline/40 px-3 py-1 text-data tabular",
                    account && account.address === w.trader && "bg-accent-brand/10",
                  )}
                >
                  <span className={w.is_up ? "text-safe" : "text-breach"}>
                    {w.is_up ? "UP▲" : "DN▼"}
                  </span>
                  <span className="truncate text-text-sec">
                    {fmtPrice(w.strike)}
                    {mny != null ? (
                      <span className="text-text-faint">
                        {" "}
                        {mny >= 0 ? "+" : "−"}
                        {(Math.abs(mny) * 100).toFixed(1)}%
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-right text-text-faint">
                    {utcClock(new Date(w.checkpoint_timestamp_ms))}
                  </span>
                  <span className="text-right text-text-dim">
                    {fmtUsdCompact(fromUnits(w.cost, DUSDC_DECIMALS))}
                  </span>
                </TxRow>
              );
            })}
          </ScrollArea>
        </>
      )}
    </Panel>
  );
}
