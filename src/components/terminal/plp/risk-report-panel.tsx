"use client";

import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildOpenBook, perOracleAttribution } from "@/lib/analytics";
import {
  useActiveOracleMarks,
  useBookFlow,
  usePredictConfig,
  useVaultSummary,
} from "@/lib/indexer/hooks";
import { fmtPct, fmtUsdCompact, fromUnits } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { LabelTip } from "../label-tip";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";
import { Hero, Stat } from "../stat";

const u = (n: number) => fromUnits(n, DUSDC_DECIMALS);

/** One-pager LP risk grade — utilization, MtM concentration and exit capacity
 *  rolled into GREEN/AMBER/RED, with a CSV/print export and the live on-chain
 *  house rules (spread/risk config), shown only when published. */
export function RiskReportPanel({ className }: { className?: string }) {
  const { data: vault, isLoading, isError } = useVaultSummary();
  const { data: config } = usePredictConfig();
  const { mints, redeems } = useBookFlow(1000);
  const { marks } = useActiveOracleMarks();
  const [copied, setCopied] = useState(false);

  const attr = useMemo(
    () => perOracleAttribution(buildOpenBook(mints, redeems), marks),
    [mints, redeems, marks],
  );

  const grade = useMemo(() => {
    if (!vault) return null;
    const exitRatio =
      vault.vault_value > 0
        ? vault.available_withdrawal / vault.vault_value
        : 1;
    let score: 0 | 1 | 2 = 0; // 0 green, 1 amber, 2 red
    const bump = (s: 0 | 1 | 2) => {
      if (s > score) score = s;
    };
    if (vault.utilization > 0.9) bump(2);
    else if (vault.utilization > 0.75) bump(1);
    if (vault.max_payout_utilization > 0.9) bump(2);
    else if (vault.max_payout_utilization > 0.75) bump(1);
    if (attr.topShare > 0.6) bump(1);
    if (exitRatio < 0.05) bump(2);
    else if (exitRatio < 0.15) bump(1);
    return [
      { label: "Green", tone: "safe" as const },
      { label: "Amber", tone: "warn" as const },
      { label: "Red", tone: "breach" as const },
    ][score];
  }, [vault, attr]);

  const copyCsv = () => {
    if (!vault) return;
    const rows: [string, string | number][] = [
      ["metric", "value"],
      ["vault_value", u(vault.vault_value)],
      ["total_mtm", u(vault.total_mtm)],
      ["total_max_payout", u(vault.total_max_payout)],
      ["available_liquidity", u(vault.available_liquidity)],
      ["available_withdrawal", u(vault.available_withdrawal)],
      ["utilization", vault.utilization],
      ["max_payout_utilization", vault.max_payout_utilization],
      ["plp_share_price", vault.plp_share_price],
      ["top_expiry_share", attr.topShare],
      ["hhi", attr.hhi],
      ["risk_grade", grade?.label ?? ""],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    navigator.clipboard?.writeText(csv).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };

  return (
    <Panel
      title="Risk report"
      code="LP grade · export"
      className={className}
      bodyClassName="p-0"
      right={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyCsv}
            className="rounded border border-hairline px-1.5 py-0.5 text-data text-text-dim transition-colors hover:border-divider hover:text-foreground"
          >
            {copied ? "Copied ✓" : "CSV"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-hairline px-1.5 py-0.5 text-data text-text-dim transition-colors hover:border-divider hover:text-foreground"
          >
            Print
          </button>
        </div>
      }
    >
      {isError ? (
        <PanelState kind="error">Vault feed unreachable</PanelState>
      ) : isLoading || !vault || !grade ? (
        <PanelState kind="empty">Grading…</PanelState>
      ) : (
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 p-3 2xl:gap-3">
            <Hero
              label="LP risk grade"
              tip="risk-grade"
              tone={grade.tone}
              value={grade.label}
              sub={
                <>
                  utilization {fmtPct(vault.utilization)} · top expiry{" "}
                  {(attr.topShare * 100).toFixed(0)}%
                </>
              }
            />

            <div className="rounded-md border border-hairline px-3 py-1">
              <Stat
                label="Vault value"
                tip="vault-value"
                value={fmtUsdCompact(u(vault.vault_value))}
              />
              <Stat
                label="Total MtM"
                tip="total-mtm"
                value={fmtUsdCompact(u(vault.total_mtm))}
              />
              <Stat
                label="Max payout"
                tip="max-payout"
                value={fmtUsdCompact(u(vault.total_max_payout))}
                tone="warn"
              />
              <Stat
                label="Utilization"
                tip="utilization"
                value={fmtPct(vault.utilization)}
              />
              <Stat
                label="Max-payout util"
                tip="max-payout-util"
                value={fmtPct(vault.max_payout_utilization)}
              />
              <Stat
                label="Binding exit"
                tip="exit-capacity"
                value={fmtUsdCompact(
                  u(Math.min(vault.available_liquidity, vault.available_withdrawal)),
                )}
              />
              <Stat
                label="Top-3 concentration"
                tip="mtm-concentration"
                value={`${(attr.top3Share * 100).toFixed(0)}%`}
              />
            </div>

            {(() => {
              const hasConfig =
                !!config?.pricing ||
                !!config?.risk ||
                config?.trading_paused != null;
              return (
                <div>
                  <LabelTip
                    k={hasConfig ? "house-rules" : "lp-economics"}
                    className="label-micro"
                  >
                    {hasConfig ? "House rules · on-chain config" : "LP economics"}
                  </LabelTip>
                  <div className="mt-1 rounded-md border border-hairline px-3 py-1">
                    {hasConfig ? (
                      <>
                        {config?.trading_paused != null ? (
                          <Stat
                            label="Trading"
                            tip="house-rules"
                            value={config.trading_paused ? "PAUSED" : "Live"}
                            tone={config.trading_paused ? "breach" : "safe"}
                          />
                        ) : null}
                        {config?.risk ? (
                          <Stat
                            label="Max exposure"
                            tip="exposure-ceiling"
                            value={fmtCeiling(config.risk.max_total_exposure_pct)}
                          />
                        ) : null}
                        {config?.pricing ? (
                          <>
                            <Stat
                              label="Base spread"
                              tip="house-rules"
                              value={fmtSpread(config.pricing.base_spread)}
                            />
                            <Stat
                              label="Min spread"
                              tip="house-rules"
                              value={fmtSpread(config.pricing.min_spread)}
                            />
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Stat
                          label="PLP share price"
                          tip="plp-share-price"
                          value={`$${vault.plp_share_price.toFixed(4)}`}
                        />
                        <Stat
                          label="Net deposits"
                          tip="net-deposits"
                          value={fmtUsdCompact(u(vault.net_deposits))}
                        />
                        <Stat
                          label="Supplied"
                          tip="supplied"
                          value={fmtUsdCompact(u(vault.total_supplied))}
                          tone="safe"
                        />
                        <Stat
                          label="Withdrawn"
                          tip="withdrawn"
                          value={fmtUsdCompact(u(vault.total_withdrawn))}
                          tone="dim"
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </ScrollArea>
      )}
    </Panel>
  );
}

/** max_total_exposure_pct — assume 1e9-scaled fraction (matches other configs). */
function fmtCeiling(raw: number): string {
  const frac = raw > 1000 ? raw / 1e9 : raw / 100;
  return `${(frac * 100).toFixed(0)}%`;
}

/** Spread params are 1e9-scaled probability units. */
function fmtSpread(raw: number): string {
  return `${((raw / 1e9) * 1e4).toFixed(0)} bps`;
}
