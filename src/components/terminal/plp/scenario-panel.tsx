"use client";

import { useMemo } from "react";
import {
  buildOpenBook,
  scenarioCurve,
  type ScenarioPoint,
} from "@/lib/analytics";
import {
  useActiveOracleMarks,
  useBookFlow,
  useVaultSummary,
} from "@/lib/indexer/hooks";
import { fmtNum, fmtUsdCompact, fromUnits } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { Curve } from "../chart/curve";
import { LightCard, LightFigures, LightLede, LightNote, LightSubLabel, Num } from "../light";
import { Hero } from "../stat";
import { LabelTip } from "../label-tip";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";

const FINE: number[] = [];
for (let n = -5; n <= 5.0001; n += 0.25) FINE.push(Math.round(n * 100) / 100);
const LADDER = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];

/** Reprices the entire open book at a forward shocked ±n·σ_T (per oracle through
 *  its own SVI), applying the change in marked liability to the live vault value.
 *  The headline is the worst-direction move the vault survives before LP wipeout. */
export function ScenarioPanel({ className }: { className?: string }) {
  const { mints, redeems, isLoading, isError } = useBookFlow(1000);
  const { marks, priced } = useActiveOracleMarks();
  const { data: vault } = useVaultSummary();

  const model = useMemo(() => {
    if (!vault) return null;
    const book = buildOpenBook(mints, redeems);
    const vv = vault.vault_value;
    // The flow window reconstructs only part of the book, so anchor its shock
    // sensitivity to the protocol's reported MtM (assumes the sample's
    // moneyness/expiry mix is representative of the whole book).
    const base = scenarioCurve(book, marks, vv, [0])[0]?.liability ?? 0;
    const scale = vault.total_mtm > 0 && base > 0 ? vault.total_mtm / base : 1;
    const curve = scenarioCurve(book, marks, vv, FINE, scale);
    const ladder = LADDER.map(
      (n) =>
        curve.find((p) => Math.abs(p.n - n) < 1e-6) ??
        scenarioCurve(book, marks, vv, [n], scale)[0],
    );
    const firstBreach = (dir: 1 | -1): number | null => {
      let last: number | null = null;
      for (const p of curve) {
        if (Math.sign(p.n) !== dir) continue;
        if (p.vaultValue <= 0) {
          if (last == null || Math.abs(p.n) < last) last = Math.abs(p.n);
        }
      }
      return last;
    };
    return { curve, ladder, breachDown: firstBreach(-1), breachUp: firstBreach(1) };
  }, [mints, redeems, marks, vault]);

  const breach = model
    ? [model.breachDown, model.breachUp].filter((x): x is number => x != null)
    : [];
  const worst = breach.length ? Math.min(...breach) : null;
  const minBuffer = model ? Math.min(...model.ladder.map((p) => p.buffer)) : 0;
  const breachDown =
    !!model &&
    model.breachDown != null &&
    (model.breachUp == null || model.breachDown <= model.breachUp);

  return (
    <Panel
      title="±5σ Scenario"
      code="Book-wide reprice"
      className={className}
      bodyClassName="lg:overflow-hidden"
      light={
        !isError && !isLoading && model && priced !== 0 ? (
          <LightCard fill>
            <LightLede>
              {worst == null ? (
                <>
                  Even a rare, violent market swing leaves the pool solvent, with
                  a <Num tone="safe">{(minBuffer * 100).toFixed(0)}%</Num> cushion
                  left in the worst case.
                </>
              ) : (
                <>
                  A{" "}
                  <Num tone={worst >= 3 ? "warn" : "breach"}>
                    {breachDown ? "−" : "+"}
                    {worst.toFixed(1)}σ
                  </Num>{" "}
                  swing would wipe out the providers who back this pool.
                </>
              )}
            </LightLede>
            <div className="flex min-h-0 flex-1 flex-col">
              <LightSubLabel tip="scenario-curve">
                Pool value as the market moves
              </LightSubLabel>
              <Curve
                className="mt-1.5 min-h-0 flex-1"
                baseline={0}
                color="var(--accent-brand)"
                data={model.curve.map((p) => ({
                  x: p.n,
                  y: fromUnits(p.vaultValue, DUSDC_DECIMALS),
                }))}
                markers={[{ x: 0, label: "now", dashed: true }]}
                hoverFormat={(p) => `${p.x >= 0 ? "+" : ""}${p.x.toFixed(1)}σ`}
              />
            </div>
            <LightFigures
              items={[
                worst == null
                  ? {
                      label: "Worst-case cushion",
                      value: `${(minBuffer * 100).toFixed(0)}%`,
                      tone: "safe",
                      tip: "stress-verdict",
                    }
                  : {
                      label: "Wipeout swing",
                      value: `${breachDown ? "−" : "+"}${worst.toFixed(1)}σ`,
                      tone: worst >= 3 ? "warn" : "breach",
                      tip: "stress-verdict",
                    },
                {
                  label: "Survives up to",
                  value: worst == null ? "±5σ" : `${worst.toFixed(1)}σ`,
                  tip: "stress-sigma",
                },
                {
                  label: "Pool value",
                  value: fmtUsdCompact(
                    fromUnits(vault!.vault_value, DUSDC_DECIMALS),
                  ),
                  tip: "available-liq",
                },
              ]}
            />
            <LightNote>
              A stress test: the blue line is the pool&apos;s value if the market
              jumps, measured in standard moves (σ). Even a rare, violent swing
              keeps it above zero, so the pool can still pay what it owes.
            </LightNote>
          </LightCard>
        ) : null
      }
    >
      {isError ? (
        <PanelState kind="error">Scenario feed unreachable</PanelState>
      ) : isLoading || !model ? (
        <PanelState kind="empty">Repricing book…</PanelState>
      ) : priced === 0 ? (
        <PanelState kind="empty">No priceable exposure</PanelState>
      ) : (
        <div className="flex h-full flex-col gap-2 2xl:gap-3">
          <Hero
            label={worst == null ? "Worst-case buffer · ±5σ" : "Breach point"}
            tip="breach-sigma"
            tone={worst == null ? "safe" : worst >= 3 ? "warn" : "breach"}
            value={
              worst == null
                ? `${(minBuffer * 100).toFixed(0)}%`
                : `${breachDown ? "−" : "+"}${worst.toFixed(1)}σ`
            }
            sub={
              worst == null ? (
                <>Solvent through ±5σ · scaled to reported MtM</>
              ) : (
                <>LP wiped · smile held fixed · scaled to reported MtM</>
              )
            }
          />

          <div className="shrink-0">
            <LabelTip k="scenario-curve" className="label-micro">
              Vault value vs shock
            </LabelTip>
            <Curve
              className="mt-1 h-32"
              baseline={0}
              color="var(--accent-brand)"
              data={model.curve.map((p) => ({
                x: p.n,
                y: fromUnits(p.vaultValue, DUSDC_DECIMALS),
              }))}
              markers={[{ x: 0, label: "spot", dashed: true }]}
              hoverFormat={(p) => `${p.x >= 0 ? "+" : ""}${p.x.toFixed(1)}σ`}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-1 grid grid-cols-[2.4rem_1fr_1fr_auto] gap-x-2 label-micro">
              <LabelTip k="scenario-ladder">Shock</LabelTip>
              <span className="text-right">Move</span>
              <span className="text-right">Vault</span>
              <span className="text-right">Buffer</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-between">
              {model.ladder.map((p) => (
                <ScenarioRowView key={p.n} p={p} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function ScenarioRowView({ p }: { p: ScenarioPoint }) {
  const tone =
    p.buffer >= 0.5 ? "text-safe" : p.buffer > 0 ? "text-warn" : "text-breach";
  return (
    <div className="grid grid-cols-[2.4rem_1fr_1fr_auto] gap-x-2 whitespace-nowrap text-data tabular">
      <span className="text-text-dim">
        {p.n > 0 ? "+" : ""}
        {p.n}σ
      </span>
      <span className="text-right text-warn">
        {p.moveFrac >= 0 ? "+" : "−"}
        {(Math.abs(p.moveFrac) * 100).toFixed(1)}%
      </span>
      <span className={cn("text-right", tone)}>
        {fmtUsdCompact(fromUnits(p.vaultValue, DUSDC_DECIMALS))}
      </span>
      <span className={cn("text-right", tone)}>
        {p.buffer > 0 ? `${fmtNum(p.buffer * 100, 0)}%` : "—"}
      </span>
    </div>
  );
}
