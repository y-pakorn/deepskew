"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useLpFlow, useVaultSummary } from "@/lib/indexer/hooks";
import { fmtUsdCompact, fromUnits, truncateAddr, utcClock } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { Hero } from "../stat";
import { LabelTip } from "../label-tip";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";

const u = (n: number) => fromUnits(n, DUSDC_DECIMALS);

/** Can LPs get out, and how much right now? The binding exit capacity against
 *  the solvency floor, with the live LP supply/withdraw tape. */
export function LimiterPanel({ className }: { className?: string }) {
  const { data, isLoading, isError } = useVaultSummary();
  const lp = useLpFlow();

  const m = data
    ? (() => {
        const binding = Math.min(
          data.available_liquidity,
          data.available_withdrawal,
        );
        const solvencyFloor = Math.max(0, data.vault_balance - data.total_max_payout);
        const limiterBinds = data.available_withdrawal < data.available_liquidity;
        const state =
          data.available_withdrawal <= 0
            ? { label: "Drained", tone: "breach" as const }
            : limiterBinds
              ? { label: "Throttled", tone: "warn" as const }
              : { label: "Open", tone: "safe" as const };
        const fill =
          data.available_liquidity > 0
            ? Math.min(1, data.available_withdrawal / data.available_liquidity)
            : 0;
        return { binding, solvencyFloor, limiterBinds, state, fill };
      })()
    : null;

  return (
    <Panel
      title="Withdrawal Limiter"
      code="LP exit capacity"
      className={className}
      bodyClassName="flex flex-col gap-2 overflow-hidden 2xl:gap-3"
    >
      {isError ? (
        <PanelState kind="error">Vault feed unreachable</PanelState>
      ) : isLoading || !data || !m ? (
        <PanelState kind="empty">Loading limiter…</PanelState>
      ) : (
        <>
          <Hero
            label="Binding exit capacity"
            tip="withdrawal-limiter"
            tone={m.state.tone}
            value={fmtUsdCompact(u(m.binding))}
            sub={
              <>
                {m.state.label} ·{" "}
                {m.limiterBinds ? "limiter budget" : "free liquidity"} · floor{" "}
                {fmtUsdCompact(u(m.solvencyFloor))}
              </>
            }
          />

          <div className="shrink-0">
            <div className="mb-1 flex items-center justify-between">
              <LabelTip k="exit-capacity" className="label-micro">
                Withdrawal budget vs free liquidity
              </LabelTip>
              <span className="text-data tabular text-text-dim">
                {(m.fill * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-elev">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500",
                  m.limiterBinds ? "bg-warn" : "bg-safe",
                )}
                style={{ width: `${m.fill * 100}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-hairline bg-hairline text-data tabular">
              <FloorCell
                label="Limiter budget"
                tip="exit-capacity"
                value={fmtUsdCompact(u(data.available_withdrawal))}
                binding={m.limiterBinds}
              />
              <FloorCell
                label="Free liquidity"
                tip="available-liq"
                value={fmtUsdCompact(u(data.available_liquidity))}
                binding={!m.limiterBinds}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-1 flex items-center justify-between">
              <LabelTip k="lp-net-flow" className="label-micro">
                LP supply / withdraw
              </LabelTip>
              <span className="text-data tabular text-text-faint">
                {lp.supplyCount}↑ {lp.withdrawCount}↓ · net{" "}
                {fmtUsdCompact(u(lp.net))}
              </span>
            </div>
            {lp.events.length ? (
              <ScrollArea className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)]">
                {lp.events.map((e, i) => (
                  <div
                    key={`${e.actor}-${e.ts}-${i}`}
                    className="grid grid-cols-[3.4rem_2.6rem_1fr_auto] items-center gap-x-2 border-b border-hairline/40 px-0.5 py-1 text-data tabular"
                  >
                    <span className="text-text-faint">
                      {utcClock(new Date(e.ts))}
                    </span>
                    <span
                      className={
                        e.type === "supply" ? "text-safe" : "text-breach"
                      }
                    >
                      {e.type === "supply" ? "IN▲" : "OUT▼"}
                    </span>
                    <span className="truncate text-text-faint">
                      {truncateAddr(e.actor)}
                    </span>
                    <span
                      className={cn(
                        "text-right",
                        e.type === "supply" ? "text-safe" : "text-text-dim",
                      )}
                    >
                      {e.type === "supply" ? "+" : "−"}
                      {fmtUsdCompact(u(e.amount))}
                    </span>
                  </div>
                ))}
              </ScrollArea>
            ) : (
              <PanelState kind="empty" className="flex-1">
                No LP flow yet
              </PanelState>
            )}
          </div>
          <p className="shrink-0 label-micro text-text-faint">
            Token-bucket refill rate is on-chain only.
          </p>
        </>
      )}
    </Panel>
  );
}

function FloorCell({
  label,
  tip,
  value,
  binding,
}: {
  label: string;
  tip: string;
  value: string;
  binding: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 bg-panel px-3 py-1.5",
        binding && "bg-accent-brand/5",
      )}
    >
      <LabelTip k={tip} className="label-micro">
        {label}
      </LabelTip>
      <span className="flex items-center gap-1.5 text-val text-text-sec">
        {binding ? (
          <span className="size-1.5 rounded-full bg-accent-brand" />
        ) : null}
        {value}
      </span>
    </div>
  );
}
