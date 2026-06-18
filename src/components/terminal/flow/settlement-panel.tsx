"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActiveOracles, useBookFlow } from "@/lib/indexer/hooks";
import { fmtPrice, fmtUsdCompact, fromUnits, utcClock } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
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
import { Pill } from "../pill";
import { Hero } from "../stat";
import { TxRow } from "../tx-row";

/** Settlement outcomes + a calibration cross-check: do the prices takers paid
 *  match how often they actually won? Surfaces PENDING_SETTLEMENT (expired but
 *  not yet settled) — a 4th state the 3-state indexer can't express. */
export function SettlementPanel({ className }: { className?: string }) {
  const { redeems, mints, isLoading, isError } = useBookFlow(500);
  const { data: oracles = [] } = useActiveOracles();
  const now = useNow();

  const m = useMemo(() => {
    const settled = redeems.filter((r) => r.is_settled);
    const total = settled.length;
    const wins = settled.filter((r) => r.payout > 0);
    const rate = (arr: typeof settled) =>
      arr.length
        ? (arr.filter((r) => r.payout > 0).length / arr.length) * 100
        : 0;
    const up = settled.filter((r) => r.is_up);
    const dn = settled.filter((r) => !r.is_up);
    const paid = (arr: typeof mints) =>
      arr.length
        ? (arr.reduce(
            (s, x) => s + (x.ask_price > 0 ? x.ask_price / 1e9 : 0),
            0,
          ) /
            arr.length) *
          100
        : 0;
    return {
      total,
      winRate: total ? (wins.length / total) * 100 : 0,
      upWin: rate(up),
      dnWin: rate(dn),
      payouts: wins.reduce((s, r) => s + r.payout, 0),
      paidUp: paid(mints.filter((x) => x.is_up)),
      paidDn: paid(mints.filter((x) => !x.is_up)),
      settled,
    };
  }, [redeems, mints]);

  const pending = useMemo(
    () => oracles.filter((o) => o.expiry < now).length,
    [oracles, now],
  );

  return (
    <Panel
      title="Settlement & Calibration"
      code="Outcomes · honesty"
      className={className}
      bodyClassName="flex flex-col gap-2 overflow-hidden 2xl:gap-3"
      light={
        !isError && m.total ? (
          <LightCard>
            <LightLede>
              Traders win about{" "}
              <Num tone={m.winRate < 50 ? "safe" : "warn"}>
                {m.winRate.toFixed(0)}%
              </Num>{" "}
              of their bets, so the house stays{" "}
              {m.winRate < 50 ? "ahead" : "behind"}, and the prices closely
              match how often each side actually wins.
            </LightLede>
            <div className="shrink-0">
              <LightSubLabel tip="settlement-outcomes">
                Where recent bets landed
              </LightSubLabel>
              <OutcomeStrip rows={m.settled} className="mt-1.5" />
            </div>
            <div className="shrink-0">
              <LightSubLabel tip="calibration">
                Did the prices match reality?
              </LightSubLabel>
              <div className="mt-1.5 space-y-1.5">
                <CalBar label="UP" priced={m.paidUp} realized={m.upWin} />
                <CalBar label="DN" priced={m.paidDn} realized={m.dnWin} />
              </div>
            </div>
            <LightFigures
              items={[
                {
                  label: "Bettor win rate",
                  value: `${m.winRate.toFixed(0)}%`,
                  tone: m.winRate < 50 ? "safe" : "warn",
                  tip: "taker-win",
                },
                {
                  label: "Settled bets",
                  value: String(m.total),
                  tip: "settlement-count",
                },
                {
                  label: "Paid to winners",
                  value: fmtUsdCompact(fromUnits(m.payouts, DUSDC_DECIMALS)),
                  tip: "payouts",
                },
              ]}
            />
            <LightNote>
              Each dot is a settled bet over time (green = the trader won); the
              bars below check whether the price charged matched the real win
              rate.
            </LightNote>
          </LightCard>
        ) : null
      }
      right={
        pending > 0 ? (
          <Pill tone="warn" tip="pending-settlement">
            {pending} pending
          </Pill>
        ) : null
      }
    >
      {isError ? (
        <PanelState kind="error">Settlement feed unreachable</PanelState>
      ) : isLoading && !m.total ? (
        <PanelState kind="empty">Loading settlements…</PanelState>
      ) : !m.total ? (
        <PanelState kind="empty">No settled positions yet</PanelState>
      ) : (
        <>
          <Hero
            label="Taker win rate"
            tip="taker-win"
            tone={m.winRate < 50 ? "safe" : "warn"}
            value={`${m.winRate.toFixed(0)}%`}
            sub={
              <>
                {m.winRate < 50 ? "Vault edge · " : ""}
                {m.total} settled · payouts{" "}
                {fmtUsdCompact(fromUnits(m.payouts, DUSDC_DECIMALS))} · UP{" "}
                {m.upWin.toFixed(0)}% DN {m.dnWin.toFixed(0)}%
              </>
            }
          />

          <div className="shrink-0">
            <LabelTip k="settlement-outcomes" className="label-micro">
              Settlement outcomes
            </LabelTip>
            <OutcomeStrip rows={m.settled} className="mt-1" />
          </div>

          <div className="shrink-0">
            <LabelTip k="calibration" className="label-micro">
              Calibration · priced vs realized
            </LabelTip>
            <div className="mt-1.5 space-y-1.5">
              <CalBar label="UP" priced={m.paidUp} realized={m.upWin} />
              <CalBar label="DN" priced={m.paidDn} realized={m.dnWin} />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid grid-cols-[3.4rem_2.4rem_1fr_auto] items-center gap-x-2 border-b border-hairline px-0.5 pb-1">
              <span className="label-micro">Time</span>
              <LabelTip k="flow-side-glyph" className="label-micro">
                Side
              </LabelTip>
              <span className="label-micro">Strike</span>
              <LabelTip k="payouts" className="label-micro ml-auto w-fit">
                Payout
              </LabelTip>
            </div>
            <ScrollArea className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)]">
              {m.settled.map((r, i) => (
                <TxRow
                  key={`${r.digest}-${i}`}
                  digest={r.digest}
                  className="grid grid-cols-[3.4rem_2.4rem_1fr_auto] items-center gap-x-2 border-b border-hairline/40 px-0.5 py-1 text-data tabular"
                >
                  <span className="text-text-faint">
                    {utcClock(new Date(r.checkpoint_timestamp_ms))}
                  </span>
                  <span className={r.is_up ? "text-safe" : "text-breach"}>
                    {r.is_up ? "UP▲" : "DN▼"}
                  </span>
                  <span className="truncate text-text-sec">
                    {fmtPrice(r.strike)}
                  </span>
                  <span
                    className={cn(
                      "text-right",
                      r.payout > 0 ? "text-safe" : "text-text-faint",
                    )}
                  >
                    {r.payout > 0
                      ? `+${fmtUsdCompact(fromUnits(r.payout, DUSDC_DECIMALS))}`
                      : "$0"}
                  </span>
                </TxRow>
              ))}
            </ScrollArea>
          </div>
        </>
      )}
    </Panel>
  );
}

/** Each settled position as a dot on a time axis — UP lane over DN lane, green
 *  when the taker won, faint when it expired worthless; sized by payout. */
function OutcomeStrip({
  rows,
  className,
}: {
  rows: { checkpoint_timestamp_ms: number; is_up: boolean; payout: number }[];
  className?: string;
}) {
  if (!rows.length) return null;
  const ts = rows.map((r) => r.checkpoint_timestamp_ms);
  const lo = Math.min(...ts);
  const hi = Math.max(...ts);
  const span = hi - lo || 1;
  const maxPay = Math.max(1, ...rows.map((r) => r.payout));
  return (
    <div className={cn("relative h-12 w-full", className)}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-hairline" />
      {rows.map((r, i) => {
        const x = ((r.checkpoint_timestamp_ms - lo) / span) * 100;
        const win = r.payout > 0;
        const size = win ? 3 + 5 * Math.sqrt(r.payout / maxPay) : 3;
        return (
          <div
            key={i}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
              win ? "bg-safe" : "bg-breach/55",
            )}
            style={{
              left: `${x}%`,
              top: r.is_up ? "30%" : "70%",
              width: size,
              height: size,
            }}
          />
        );
      })}
      <span className="label-micro absolute top-0 left-0 text-text-faint">
        UP
      </span>
      <span className="label-micro absolute bottom-0 left-0 text-text-faint">
        DN
      </span>
    </div>
  );
}

/** A priced-vs-realized bar: the gap between what takers paid (implied prob) and
 *  how often that side actually won. */
function CalBar({
  label,
  priced,
  realized,
}: {
  label: string;
  priced: number;
  realized: number;
}) {
  // realized < priced ⇒ that side won less often than takers paid for ⇒ vault edge.
  const vaultEdge = realized <= priced;
  return (
    <div className="grid grid-cols-[1.6rem_1fr_4.6rem] items-center gap-2 text-data tabular">
      <span className="text-text-dim">{label}</span>
      <div className="relative h-2 overflow-hidden rounded-full bg-panel-elev">
        <div
          className="absolute inset-y-0 left-0 bg-accent-brand/35"
          style={{ width: `${Math.min(100, priced)}%` }}
        />
        <div
          className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-foreground"
          style={{ left: `${Math.min(100, Math.max(0, realized))}%` }}
        />
      </div>
      <span className="text-right whitespace-nowrap text-text-faint">
        {priced.toFixed(0)}
        <span className="px-0.5">→</span>
        <span className={vaultEdge ? "text-safe" : "text-breach"}>
          {realized.toFixed(0)}
        </span>
      </span>
    </div>
  );
}
