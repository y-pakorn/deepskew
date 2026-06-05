"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type FlowItem,
  useManagerPnl,
  useManagerPositions,
  useManagerRanges,
  useManagerSummary,
  useManagerTrades,
} from "@/lib/indexer/hooks";
import type { ManagerPositionSummary, ManagerSummary } from "@/lib/indexer/types";
import {
  fmtDuration,
  fmtPrice,
  fmtUsdCompact,
  fromUnits,
  truncateAddr,
  utcClock,
} from "@/lib/format";
import { DUSDC_DECIMALS, explorerAccount } from "@/lib/sui/constants";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { Curve } from "../chart/curve";
import { LabelTip } from "../label-tip";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";
import { Pill, type PillTone } from "../pill";
import { MonoValue, Stat, StatTile, TileGrid } from "../stat";

const u = (n: number) => fromUnits(n, DUSDC_DECIMALS);
const signedUsd = (n: number) =>
  `${n >= 0 ? "+" : "−"}${fmtUsdCompact(Math.abs(u(n)))}`;
const sign = (n: number) => (n >= 0 ? "text-safe" : "text-breach");

const STATUS_TONE: Record<string, PillTone> = {
  redeemable: "up",
  awaiting_settlement: "warn",
  redeemed: "neutral",
  lost: "down",
  open: "accent",
  active: "accent",
};

/** A single manager's account: a hero PnL band over three filled columns —
 *  realized-PnL equity + balances, the mark-priced open book, and a live trade
 *  tape. Reached from the leaderboard, market panel, tapes and flow. */
export function ManagerDetail({ managerId }: { managerId: string }) {
  const { data: summary, isLoading, isError } = useManagerSummary(managerId);
  const { data: pnl } = useManagerPnl(managerId, "ALL");
  const { data: positions = [] } = useManagerPositions(managerId);
  const { items: trades } = useManagerTrades(managerId);
  const { data: ranges } = useManagerRanges(managerId);
  const now = useNow();

  const equity = useMemo(
    () =>
      (pnl?.points ?? []).map((p) => ({
        x: p.timestamp_ms,
        y: u(p.cumulative_realized_pnl),
      })),
    [pnl],
  );

  const d = useMemo(() => {
    const settled = positions.filter(
      (p) => p.status === "redeemed" || p.status === "lost",
    );
    const wins = settled.filter((p) => p.realized_pnl > 0).length;
    const winRate = settled.length ? (wins / settled.length) * 100 : null;
    const open = positions
      .filter(
        (p) =>
          p.open_quantity > 0 ||
          p.status === "awaiting_settlement" ||
          p.status === "redeemable",
      )
      .sort((a, b) => b.expiry - a.expiry);
    const volume = positions.reduce((s, p) => s + p.total_cost, 0);
    return { settled, wins, losses: settled.length - wins, winRate, open, volume };
  }, [positions]);

  const rangeCount = ranges?.minted.length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 overflow-hidden border-b border-hairline bg-canvas px-3 text-val">
        <Link
          href="/managers"
          className="flex items-center gap-1 text-text-dim transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Managers
        </Link>
        <span className="text-text-faint">/</span>
        <span className="tabular text-text-sec">{truncateAddr(managerId)}</span>
        {summary ? (
          <a
            href={explorerAccount(summary.owner)}
            target="_blank"
            rel="noreferrer"
            className="ml-auto shrink-0 tabular text-data text-text-faint transition-colors hover:text-text-dim"
          >
            owner {truncateAddr(summary.owner)} ↗
          </a>
        ) : null}
      </div>

      {isError ? (
        <PanelState kind="error">Manager feed unreachable</PanelState>
      ) : isLoading && !summary ? (
        <PanelState kind="empty">Loading manager…</PanelState>
      ) : !summary ? (
        <PanelState kind="empty">Manager not found</PanelState>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr]">
          <HeroBand summary={summary} d={d} rangeCount={rangeCount} />
          <div className="grid min-h-0 grid-cols-1 gap-px bg-hairline lg:grid-cols-3">
            <PerformancePanel summary={summary} equity={equity} d={d} />
            <Panel
              title="Open positions"
              code="mark-priced"
              bodyClassName="flex flex-col overflow-hidden p-0"
              right={
                <span className="label-micro text-text-faint">
                  <span className="tabular">{d.open.length}</span> open
                </span>
              }
            >
              {d.open.length ? (
                <>
                  <div className="grid grid-cols-[2.8rem_2.4rem_1fr_3.2rem_3.4rem_auto] items-center gap-x-2 border-b border-hairline px-3 py-1.5">
                    <span className="label-micro">Expiry</span>
                    <span className="label-micro">Side</span>
                    <span className="label-micro">Strike</span>
                    <span className="label-micro text-right">Mark</span>
                    <span className="label-micro text-right">uPnL</span>
                    <span className="label-micro text-right">Status</span>
                  </div>
                  <ScrollArea className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)]">
                    {d.open.map((p, i) => (
                      <PositionRow
                        key={`${p.oracle_id}-${p.strike}-${p.is_up}-${i}`}
                        p={p}
                        now={now}
                      />
                    ))}
                  </ScrollArea>
                </>
              ) : (
                <PanelState kind="empty" className="flex-1">
                  No open positions
                </PanelState>
              )}
            </Panel>
            <Panel
              title="Activity"
              code="trade tape"
              bodyClassName="flex flex-col overflow-hidden p-0"
              right={
                <span className="label-micro text-text-faint">
                  {trades.length ? (
                    <>
                      <span className="tabular">{trades.length}</span> trades
                    </>
                  ) : (
                    "—"
                  )}
                  {rangeCount ? (
                    <>
                      {" · "}
                      <span className="tabular">{rangeCount}</span> ranges
                    </>
                  ) : null}
                </span>
              }
            >
              {trades.length ? (
                <>
                  <div className="grid grid-cols-[3.4rem_2.4rem_1fr_auto] items-center gap-x-2 border-b border-hairline px-3 py-1.5">
                    <span className="label-micro">Time</span>
                    <span className="label-micro">Side</span>
                    <span className="label-micro">Strike</span>
                    <LabelTip k="flow-columns" className="label-micro text-right">
                      Prem/payout
                    </LabelTip>
                  </div>
                  <ScrollArea className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)]">
                    {trades.map((t, i) => (
                      <TradeRow key={`${t.digest}-${t.kind}-${i}`} t={t} />
                    ))}
                  </ScrollArea>
                </>
              ) : (
                <PanelState kind="empty" className="flex-1">
                  No trades
                </PanelState>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

interface Derived {
  settled: ManagerPositionSummary[];
  wins: number;
  losses: number;
  winRate: number | null;
  open: ManagerPositionSummary[];
  volume: number;
}

function HeroBand({
  summary,
  d,
  rangeCount,
}: {
  summary: ManagerSummary;
  d: Derived;
  rangeCount: number;
}) {
  const total = summary.realized_pnl + summary.unrealized_pnl;
  return (
    <div className="shrink-0 border-b border-hairline bg-panel">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3 px-4 pt-3 pb-2.5">
        <div className="min-w-0">
          <LabelTip k="account-blotter" className="label-micro">
            Total PnL
          </LabelTip>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <MonoValue
              className={cn(
                "text-hero font-medium tracking-tight leading-none",
                sign(total),
              )}
            >
              {signedUsd(total)}
            </MonoValue>
            <span className="text-val tabular text-text-dim">
              realized{" "}
              <span className={sign(summary.realized_pnl)}>
                {signedUsd(summary.realized_pnl)}
              </span>{" "}
              · unrealized{" "}
              <span className={sign(summary.unrealized_pnl)}>
                {signedUsd(summary.unrealized_pnl)}
              </span>
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-end gap-7">
          <HeroStat
            label="Win rate"
            value={d.winRate != null ? `${d.winRate.toFixed(0)}%` : "—"}
            tone={
              d.winRate == null
                ? undefined
                : d.winRate >= 50
                  ? "text-safe"
                  : "text-warn"
            }
          />
          <HeroStat
            label="Settled W/L"
            value={`${d.wins}/${d.losses}`}
          />
          <HeroStat label="Volume" value={fmtUsdCompact(u(d.volume))} />
          {rangeCount ? (
            <HeroStat label="Ranges" value={`${rangeCount}`} />
          ) : null}
        </div>
      </div>
      <TileGrid cols={6} className="border-t border-hairline">
        <StatTile
          label="Account value"
          tip="account-value"
          value={fmtUsdCompact(u(summary.account_value))}
          focal
        />
        <StatTile
          label="Open exposure"
          tip="open-exposure"
          value={fmtUsdCompact(u(summary.open_exposure))}
        />
        <StatTile
          label="Redeemable"
          tip="redeemable"
          value={fmtUsdCompact(u(summary.redeemable_value))}
          tone={summary.redeemable_value > 0 ? "safe" : "dim"}
        />
        <StatTile
          label="Balance"
          tip="account-value"
          value={fmtUsdCompact(u(summary.trading_balance))}
          tone="dim"
        />
        <StatTile label="Open" value={`${summary.open_positions}`} />
        <StatTile
          label="Awaiting"
          value={`${summary.awaiting_settlement_positions}`}
          tone={summary.awaiting_settlement_positions > 0 ? "warn" : "default"}
        />
      </TileGrid>
    </div>
  );
}

function HeroStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="label-micro">{label}</span>
      <MonoValue className={cn("text-lead font-medium leading-none", tone)}>
        {value}
      </MonoValue>
    </div>
  );
}

function PerformancePanel({
  summary,
  equity,
  d,
}: {
  summary: ManagerSummary;
  equity: { x: number; y: number }[];
  d: Derived;
}) {
  return (
    <Panel
      title="Performance"
      code="equity · balances"
      bodyClassName="flex flex-col gap-3 overflow-hidden"
    >
      <div className="shrink-0">
        <LabelTip k="equity-curve" className="label-micro">
          Realized PnL equity
        </LabelTip>
        {equity.length >= 2 ? (
          <Curve
            className="mt-1 h-32"
            baseline={0}
            data={equity}
            hoverFormat={(p) => `$${p.y.toFixed(2)}`}
          />
        ) : (
          <div className="mt-1 flex h-32 items-center justify-center rounded border border-hairline">
            <span className="label-micro text-text-faint">
              No realized PnL history
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0">
        <div className="mb-1 flex items-center justify-between">
          <LabelTip k="taker-win" className="label-micro">
            Settled win rate
          </LabelTip>
          <span className="text-data tabular text-text-dim">
            <span className="text-safe">{d.wins}W</span>{" "}
            <span className="text-breach">{d.losses}L</span>
          </span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-breach/30">
          <div
            className="h-full bg-safe"
            style={{ width: `${d.winRate ?? 0}%` }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <LabelTip k="account-value" className="label-micro">
          Balances
        </LabelTip>
        <ScrollArea className="mt-1 min-h-0 flex-1">
          {summary.balances.length ? (
            summary.balances.map((b) => (
              <Stat
                key={b.quote_asset}
                label={b.quote_asset.split("::").pop() ?? "asset"}
                value={fmtUsdCompact(u(b.balance))}
              />
            ))
          ) : (
            <span className="label-micro text-text-faint">No balances</span>
          )}
          <Stat
            label="Trading balance"
            value={fmtUsdCompact(u(summary.trading_balance))}
            tone="dim"
          />
          <Stat
            label="Open exposure"
            value={fmtUsdCompact(u(summary.open_exposure))}
            tone="dim"
          />
          <Stat
            label="Redeemable"
            value={fmtUsdCompact(u(summary.redeemable_value))}
            tone={summary.redeemable_value > 0 ? "safe" : "dim"}
          />
        </ScrollArea>
      </div>
    </Panel>
  );
}

function PositionRow({ p, now }: { p: ManagerPositionSummary; now: number }) {
  return (
    <div className="grid grid-cols-[2.8rem_2.4rem_1fr_3.2rem_3.4rem_auto] items-center gap-x-2 border-b border-hairline/40 px-3 py-1.5 text-data tabular">
      <span className="text-text-faint">
        {p.expiry > now ? fmtDuration(p.expiry - now) : "exp"}
      </span>
      <span className={p.is_up ? "text-safe" : "text-breach"}>
        {p.is_up ? "UP▲" : "DN▼"}
      </span>
      <span className="truncate text-text-sec">{fmtPrice(p.strike)}</span>
      <span className="text-right text-text-dim">
        {p.mark_price != null ? (p.mark_price / 1e9).toFixed(2) : "—"}
      </span>
      <span className={cn("text-right", sign(p.unrealized_pnl))}>
        {signedUsd(p.unrealized_pnl)}
      </span>
      <span className="flex justify-end">
        <Pill tone={STATUS_TONE[p.status] ?? "neutral"}>
          {p.status.replace("_", " ")}
        </Pill>
      </span>
    </div>
  );
}

function TradeRow({ t }: { t: FlowItem }) {
  const amt = fromUnits(t.amount, DUSDC_DECIMALS);
  const isRedeem = t.kind === "redeem";
  return (
    <div className="grid grid-cols-[3.4rem_2.4rem_1fr_auto] items-center gap-x-2 border-b border-hairline/40 px-3 py-1 text-data tabular">
      <span className="text-text-faint">{utcClock(new Date(t.ts))}</span>
      <span className={t.isUp ? "text-safe" : "text-breach"}>
        {t.isUp ? "UP▲" : "DN▼"}
      </span>
      <span className="truncate text-text-sec">{fmtPrice(t.strike)}</span>
      <span
        className={cn(
          "text-right",
          isRedeem ? (amt > 0 ? "text-safe" : "text-text-faint") : "text-text-dim",
        )}
      >
        {isRedeem
          ? amt > 0
            ? `+$${amt.toFixed(2)}`
            : "$0.00"
          : `−$${amt.toFixed(2)}`}
      </span>
    </div>
  );
}
