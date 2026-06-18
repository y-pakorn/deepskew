"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildOpenBook, perOracleAttribution } from "@/lib/analytics";
import {
  useActiveOracleMarks,
  useBookFlow,
  useVaultSummary,
} from "@/lib/indexer/hooks";
import { fmtDuration, fmtUsdCompact, fromUnits } from "@/lib/format";
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
import { Hero, StatTile, TileGrid } from "../stat";

/** Decomposes the single global MtM the vault shows into per-expiry marked
 *  liability — answering "which expiry blows up the vault". Reconstructs the open
 *  book from flow and marks every leg at fair Φ(d₂). */
export function AttributionPanel({ className }: { className?: string }) {
  const { mints, redeems, truncated, isLoading, isError } = useBookFlow(1000);
  const { marks, priced } = useActiveOracleMarks();
  const { data: vault } = useVaultSummary();
  const now = useNow();

  const attr = useMemo(
    () => perOracleAttribution(buildOpenBook(mints, redeems), marks),
    [mints, redeems, marks],
  );

  const conc =
    attr.hhi >= 0.5
      ? { label: "Concentrated", tone: "warn" as const }
      : attr.hhi <= 0.25
        ? { label: "Diversified", tone: "safe" as const }
        : { label: "Balanced", tone: "default" as const };
  const maxShare = attr.rows[0]?.share ?? 0;
  // The reconstructed liability is a sample; show each expiry's share applied to
  // the protocol's reported MtM so the dollar figures are anchored to reality.
  const mtm = vault?.total_mtm ?? 0;

  return (
    <Panel
      title="Per-Oracle Risk"
      code="MtM by expiry"
      className={className}
      bodyClassName="flex flex-col overflow-hidden p-0"
      right={
        truncated ? (
          <Pill tone="warn" tip="book-truncated">
            Partial book
          </Pill>
        ) : null
      }
      light={
        !isError && priced !== 0 && attr.rows.length ? (
          <LightCard>
            <LightLede>
              Risk is spread{" "}
              {conc.tone === "warn" ? "unevenly" : "fairly evenly"} across expiry
              dates, and the single biggest one carries{" "}
              <Num tone={conc.tone === "warn" ? "warn" : undefined}>
                {(attr.topShare * 100).toFixed(0)}%
              </Num>{" "}
              of the open bets.
            </LightLede>
            <div className="shrink-0">
              <LightSubLabel tip="marked-liability">
                Risk carried by each expiry date
              </LightSubLabel>
              <div className="mt-1.5">
                {attr.rows.slice(0, 6).map((r) => (
                  <div
                    key={r.oracleId}
                    className="grid grid-cols-[3.2rem_1fr_2.6rem] items-center gap-x-2 py-1 text-data tabular"
                  >
                    <span className="text-text-faint">
                      {fmtDuration(r.expiry - now)}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-panel-elev">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            r.netDir >= 0 ? "bg-safe" : "bg-breach",
                          )}
                          style={{
                            width: `${maxShare > 0 ? (r.share / maxShare) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-text-sec">
                        {fmtUsdCompact(fromUnits(r.share * mtm, DUSDC_DECIMALS))}
                      </span>
                    </div>
                    <span className="text-right text-text-dim">
                      {(r.share * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <LightFigures
              items={[
                {
                  label: "Biggest expiry",
                  value: `${(attr.topShare * 100).toFixed(0)}%`,
                  tone: conc.tone === "warn" ? "warn" : undefined,
                  tip: "mtm-concentration",
                },
                {
                  label: "Top 3 combined",
                  value: `${(attr.top3Share * 100).toFixed(0)}%`,
                  tip: "mtm-concentration",
                },
                {
                  label: "Spread score",
                  value: attr.hhi.toFixed(2),
                  tip: "mtm-concentration",
                },
              ]}
            />
            <LightNote>
              Each bar is one expiry date and how much of the open risk sits on
              it. {conc.tone === "warn"
                ? "Right now the risk is piled onto one date, so that expiry matters most."
                : "Risk is split across many dates, so no single expiry can sink the vault."}
            </LightNote>
          </LightCard>
        ) : null
      }
    >
      {isError ? (
        <PanelState kind="error">Exposure feed unreachable</PanelState>
      ) : isLoading && !attr.rows.length ? (
        <PanelState kind="empty">Reconstructing book…</PanelState>
      ) : priced === 0 || !attr.rows.length ? (
        <PanelState kind="empty">No priceable open exposure</PanelState>
      ) : (
        <>
          <div className="border-b border-hairline p-3">
            <Hero
              label="Top expiry share of MtM"
              tip="mtm-concentration"
              tone={conc.tone}
              value={`${(attr.topShare * 100).toFixed(0)}%`}
              sub={
                <>
                  {conc.label} · top-3 {(attr.top3Share * 100).toFixed(0)}% · HHI{" "}
                  {attr.hhi.toFixed(2)}
                </>
              }
            />
            <TileGrid cols={2} className="mt-3">
              <StatTile
                label="Open MtM"
                tip="mtm-tieout"
                value={
                  vault
                    ? fmtUsdCompact(fromUnits(mtm, DUSDC_DECIMALS))
                    : "—"
                }
              />
              <StatTile
                label="Top expiry MtM"
                tip="marked-liability"
                value={fmtUsdCompact(fromUnits(maxShare * mtm, DUSDC_DECIMALS))}
                tone="warn"
              />
            </TileGrid>
          </div>

          <div className="grid grid-cols-[3.2rem_1fr_2.6rem] items-center gap-x-2 border-b border-hairline px-3 py-1.5">
            <span className="label-micro">Expiry</span>
            <LabelTip k="marked-liability" className="label-micro">
              Liability
            </LabelTip>
            <span className="label-micro text-right">Share</span>
          </div>
          <ScrollArea className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)]">
            {attr.rows.map((r) => (
              <div
                key={r.oracleId}
                className="grid grid-cols-[3.2rem_1fr_2.6rem] items-center gap-x-2 border-b border-hairline/40 px-3 py-1.5 text-data tabular"
              >
                <span className="text-text-faint">
                  {fmtDuration(r.expiry - now)}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-panel-elev">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        r.netDir >= 0 ? "bg-safe/80" : "bg-breach/80",
                      )}
                      style={{
                        width: `${maxShare > 0 ? (r.share / maxShare) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-text-sec">
                    {fmtUsdCompact(fromUnits(r.share * mtm, DUSDC_DECIMALS))}
                  </span>
                </div>
                <span className="text-right text-text-dim">
                  {(r.share * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </ScrollArea>
        </>
      )}
    </Panel>
  );
}
