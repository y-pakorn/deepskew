"use client";

import { useMemo } from "react";
import {
  borrowApr,
  pickBtcPair,
  pickUsdcMarginPool,
  useDeepBookSummary,
  useMarginPools,
} from "@/lib/deepbook";
import { useVaultPerformance } from "@/lib/indexer/hooks";
import {
  fmtNum,
  fmtPctValue,
  fmtSigned,
  fmtUsdCompact,
  fromUnits,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Hero, MonoValue, Stat, toneClass, type Tone } from "../stat";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

/**
 * Composability — Predict in its DeepBook context. The PLP vault is single-
 * primitive on its own; this reads the two adjacent live primitives and frames
 * the loop the protocol's composability thesis is built on: borrow dUSDC on
 * deepbook_margin, supply it to the Predict PLP vault, hedge on the DeepBook
 * spot CLOB. Leads with the net carry, shows the loop as a three-step flow, then
 * the supporting on-chain config. Everything read live, nothing mocked.
 */
export function ComposabilityPanel({ className }: { className?: string }) {
  const summaryQ = useDeepBookSummary();
  const marginQ = useMarginPools();
  const { data: perf } = useVaultPerformance();

  const spot = pickBtcPair(summaryQ.data);
  const pool = pickUsdcMarginPool(marginQ.data);
  const cfg = pool?.config_json?.interest_config ?? null;
  const poolCfg = pool?.config_json?.margin_pool_config ?? null;

  // PLP supply yield (annualized share-price growth) — the loop's earning leg.
  const plpApy = useMemo(() => {
    const pts = perf?.points ?? [];
    if (pts.length < 2) return null;
    const a = pts[0];
    const b = pts[pts.length - 1];
    const years = (b.timestamp_ms - a.timestamp_ms) / MS_PER_YEAR;
    if (years <= 0 || a.share_price <= 0) return null;
    return (b.share_price / a.share_price - 1) / years * 100;
  }, [perf]);
  const sharePrice = useMemo(() => {
    const pts = perf?.points ?? [];
    return pts.length ? pts[pts.length - 1].share_price : null;
  }, [perf]);

  const optUtil = cfg ? cfg.optimal_utilization / 1e9 : null;
  const maxUtil = poolCfg ? poolCfg.max_utilization_rate / 1e9 : null;
  const borrowAtOpt = cfg ? borrowApr(cfg, optUtil ?? 0.8) * 100 : null;
  const borrowAtMax =
    cfg && maxUtil != null ? borrowApr(cfg, maxUtil) * 100 : null;
  const netCarry =
    plpApy != null && borrowAtOpt != null ? plpApy - borrowAtOpt : null;

  const spotPrice = spot
    ? Number(spot.last_price) > 0
      ? Number(spot.last_price)
      : (Number(spot.highest_bid) + Number(spot.lowest_ask)) / 2 || null
    : null;
  const spotVol = spot ? Number(spot.quote_volume) : null;
  const spotChg = spot ? Number(spot.price_change_percent_24h) || 0 : null;

  const carryTone: Tone =
    netCarry == null ? "dim" : netCarry >= 0 ? "safe" : "breach";
  const usdcSym = symbolOf(pool?.asset_type);

  const bothErr = summaryQ.isError && marginQ.isError;
  const booting = summaryQ.isLoading && marginQ.isLoading && !spot && !cfg;

  return (
    <Panel
      title="Composability"
      code="Predict × Margin × Spot"
      className={className}
      bodyClassName="flex flex-col gap-3 overflow-auto p-3"
    >
      {bothErr ? (
        <PanelState kind="error">DeepBook indexer unreachable</PanelState>
      ) : booting ? (
        <PanelState kind="empty">Reading DeepBook stack…</PanelState>
      ) : (
        <>
          <Hero
            label="Borrow-and-supply loop carry"
            tone={carryTone}
            value={netCarry == null ? "—" : `${fmtSigned(netCarry, 1)}%`}
            sub={
              netCarry == null
                ? "Awaiting PLP yield + borrow rate"
                : `Borrow ${fmtPctValue(borrowAtOpt ?? 0)} on margin → supply ${fmtPctValue(plpApy ?? 0)} to PLP`
            }
          />

          {/* The loop, as a connected three-step flow across three primitives. */}
          <div className="flex flex-col gap-1.5 lg:flex-row lg:items-stretch">
            <LoopLeg
              n={1}
              primitive="DeepBook margin"
              action="Borrow dUSDC"
              value={borrowAtOpt != null ? fmtPctValue(borrowAtOpt) : "—"}
              unit="APR"
              tone="warn"
              note={optUtil != null ? `At ${(optUtil * 100).toFixed(0)}% optimal util` : undefined}
            />
            <Arrow />
            <LoopLeg
              n={2}
              primitive="Predict PLP"
              action="Supply vault"
              value={plpApy != null ? fmtPctValue(plpApy) : "—"}
              unit="APY"
              tone="safe"
              note={sharePrice != null ? `$${sharePrice.toFixed(4)} / share` : undefined}
            />
            <Arrow />
            <LoopLeg
              n={3}
              primitive="DeepBook spot"
              action="Hedge BTC/USDC"
              value={
                spotPrice && spotPrice > 0
                  ? `$${fmtNum(spotPrice, spotPrice > 100 ? 0 : 4)}`
                  : "—"
              }
              unit=""
              tone="accent"
              note={
                spotPrice && spotPrice > 0
                  ? spot?.trading_pairs
                  : "Live · awaiting trades"
              }
            />
          </div>

          {/* Supporting on-chain config, aligned ledgers. */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
            <div>
              <span className="label-micro text-text-dim">
                DeepBook margin · {usdcSym}
              </span>
              <div className="mt-1 rounded-md border border-hairline px-3 py-1">
                {cfg && poolCfg ? (
                  <>
                    <Stat
                      label="Optimal utilization"
                      value={optUtil != null ? fmtPctValue(optUtil * 100, 0) : "—"}
                    />
                    <Stat
                      label="Max utilization"
                      value={maxUtil != null ? fmtPctValue(maxUtil * 100, 0) : "—"}
                      tone="warn"
                    />
                    <Stat
                      label="Borrow APR at max"
                      value={borrowAtMax != null ? fmtPctValue(borrowAtMax) : "—"}
                      tone="breach"
                    />
                    <Stat
                      label="Min borrow"
                      value={fmtUsdCompact(fromUnits(poolCfg.min_borrow, 6))}
                      tone="dim"
                    />
                  </>
                ) : (
                  <span className="label-micro text-text-faint">
                    No margin pool on Testnet yet
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="label-micro text-text-dim">
                DeepBook spot · {spot?.trading_pairs ?? "BTC/USDC"}
              </span>
              <div className="mt-1 rounded-md border border-hairline px-3 py-1">
                {spot ? (
                  <>
                    <Stat
                      label="CLOB price"
                      value={
                        spotPrice && spotPrice > 0
                          ? `$${fmtNum(spotPrice, spotPrice > 100 ? 0 : 4)}`
                          : "—"
                      }
                      focal
                    />
                    <Stat
                      label="24h volume"
                      value={spotVol != null ? fmtUsdCompact(spotVol) : "—"}
                    />
                    <Stat
                      label="24h change"
                      value={spotChg != null ? `${fmtSigned(spotChg, 2)}%` : "—"}
                      tone={
                        spotChg == null ? "dim" : spotChg >= 0 ? "safe" : "breach"
                      }
                    />
                  </>
                ) : (
                  <span className="label-micro text-text-faint">
                    No BTC spot pool on Testnet yet
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="label-micro text-text-faint">
            Three Sui primitives in one position. Borrow on margin, supply the
            PLP vault, hedge on spot. Rates and prices read live from the
            DeepBook v3 and Margin indexers.
          </p>
        </>
      )}
    </Panel>
  );
}

/** One leg of the loop: a numbered primitive with its headline rate/price. */
function LoopLeg({
  n,
  primitive,
  action,
  value,
  unit,
  tone,
  note,
}: {
  n: number;
  primitive: string;
  action: string;
  value: string;
  unit: string;
  tone: Tone;
  note?: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-md border border-hairline bg-panel-elev/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-panel-elev text-[10px] leading-none tabular text-text-dim">
          {n}
        </span>
        <span className="truncate text-data tabular text-text-dim">
          {primitive}
        </span>
      </div>
      <span className="label-micro text-text-faint">{action}</span>
      <div className="flex items-baseline gap-1">
        <MonoValue
          className={cn(
            "text-lead font-medium leading-none tracking-tight",
            toneClass(tone),
          )}
        >
          {value}
        </MonoValue>
        {unit ? <span className="affix text-text-faint">{unit}</span> : null}
      </div>
      {note ? (
        <span className="label-micro text-text-faint">{note}</span>
      ) : null}
    </div>
  );
}

/** Step connector between loop legs — horizontal on lg, hidden when stacked. */
function Arrow() {
  return (
    <span className="hidden shrink-0 items-center justify-center px-1 text-text-faint lg:flex">
      →
    </span>
  );
}

/** Short asset symbol from a fully-qualified Move type (…::dusdc::DUSDC). */
function symbolOf(assetType: string | undefined): string {
  if (!assetType) return "USDC pool";
  const parts = assetType.split("::");
  return parts[parts.length - 1] ?? "USDC";
}
