"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ManagerSummary } from "@/lib/indexer/types";
import {
  type CohortRow,
  useManagerCohort,
  useManagerSummaries,
} from "@/lib/indexer/hooks";
import { fmtUsdCompact, fromUnits, truncateAddr } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";
import {
  LightCard,
  LightFigures,
  LightLede,
  LightNote,
  LightSubLabel,
  Num,
} from "../light";

const u = (n: number) => fromUnits(n, DUSDC_DECIMALS);
const signedUsd = (n: number) =>
  `${n >= 0 ? "+" : "−"}${fmtUsdCompact(Math.abs(u(n)))}`;

type SortKey =
  | "realized"
  | "unrealized"
  | "total"
  | "value"
  | "exposure"
  | "open"
  | "volume";

const PAGE = 18;
const GRID =
  "grid [grid-template-columns:1.8rem_minmax(6rem,1.3fr)_repeat(7,minmax(0,1fr))] items-center gap-x-2";

const COLS: { key: SortKey; label: string }[] = [
  { key: "realized", label: "Realized" },
  { key: "unrealized", label: "Unreal" },
  { key: "total", label: "Total" },
  { key: "value", label: "Value" },
  { key: "exposure", label: "Exposure" },
  { key: "open", label: "Open" },
  { key: "volume", label: "Vol" },
];

interface PageRow extends CohortRow {
  rank: number;
  s?: ManagerSummary;
}

/** A sort value; rows still loading their summary sink to the bottom. */
const metric = (r: PageRow, k: SortKey): number => {
  if (k === "volume") return r.volume;
  if (!r.s) return -Infinity;
  return {
    realized: r.s.realized_pnl,
    unrealized: r.s.unrealized_pnl,
    total: r.s.realized_pnl + r.s.unrealized_pnl,
    value: r.s.account_value,
    exposure: r.s.open_exposure,
    open: r.s.open_positions,
  }[k];
};

/** Volume-ranked, paginated desk leaderboard. Summaries are fetched **only for
 *  the visible page** (the on-chain-priced route can't be fanned out); the page
 *  can be re-sorted by any column. Click a row for the desk's full account. */
export function LeaderboardPanel({ className }: { className?: string }) {
  const account = useCurrentAccount();
  const { rows: cohort, isLoading } = useManagerCohort();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "volume",
    dir: -1,
  });

  const pages = Math.max(1, Math.ceil(cohort.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const pageCohort = cohort.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const pageIds = useMemo(
    () => pageCohort.map((c) => c.managerId),
    [pageCohort],
  );
  const { byId, loaded } = useManagerSummaries(pageIds);

  const rows: PageRow[] = pageCohort.map((c, i) => ({
    ...c,
    rank: safePage * PAGE + i + 1,
    s: byId.get(c.managerId),
  }));
  const sorted = [...rows].sort(
    (a, b) => (metric(a, sort.key) - metric(b, sort.key)) * sort.dir,
  );

  const onSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === -1 ? 1 : -1 } : { key, dir: -1 },
    );

  // Light card: busiest desks first (cohort is volume-ranked), with whatever
  // summaries this page has loaded. Top row = the most active desk overall.
  const byVolume = [...rows].sort((a, b) => b.volume - a.volume);
  const topDesks = byVolume.slice(0, 6);
  const top = topDesks[0];
  const topTotal =
    top?.s != null ? top.s.realized_pnl + top.s.unrealized_pnl : undefined;

  return (
    <Panel
      title="Manager Leaderboard"
      code="Ranked by volume · click a desk"
      className={className}
      bodyClassName="flex flex-col overflow-hidden p-0"
      light={
        cohort.length > 0 && top ? (
          <LightCard>
            <LightLede>
              Of <Num>{cohort.length}</Num> trading desks, the busiest has
              traded <Num>{fmtUsdCompact(u(top.volume))}</Num>
              {topTotal != null ? (
                <>
                  {" "}
                  and is currently{" "}
                  {topTotal >= 0 ? "up" : "down"}{" "}
                  <Num tone={topTotal >= 0 ? "safe" : "breach"}>
                    {signedUsd(topTotal)}
                  </Num>
                  .
                </>
              ) : (
                <>.</>
              )}
            </LightLede>
            <div className="shrink-0">
              <LightSubLabel tip="leaderboard">Busiest desks</LightSubLabel>
              <div className="mt-1.5 space-y-px">
                {topDesks.map((r) => {
                  const tot =
                    r.s != null
                      ? r.s.realized_pnl + r.s.unrealized_pnl
                      : undefined;
                  return (
                    <Link
                      key={r.managerId}
                      href={`/managers/${r.managerId}`}
                      className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded px-2 py-1 text-data tabular transition-colors hover:bg-panel-elev/50"
                    >
                      <span className="text-text-faint">{r.rank}</span>
                      <span className="truncate text-text-sec">
                        {truncateAddr(r.owner)}
                      </span>
                      <span className="text-right text-text-dim">
                        {fmtUsdCompact(u(r.volume))}
                      </span>
                      <span
                        className={cn(
                          "w-16 text-right",
                          tot == null
                            ? "text-text-faint"
                            : tot >= 0
                              ? "text-safe"
                              : "text-breach",
                        )}
                      >
                        {tot == null ? "·" : signedUsd(tot)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <LightFigures
              items={[
                { label: "Active desks", value: String(cohort.length), tip: "leaderboard" },
                {
                  label: "Top volume",
                  value: fmtUsdCompact(u(top.volume)),
                  tip: "vol-premium",
                },
                {
                  label: "Top desk's profit",
                  value: topTotal == null ? "·" : signedUsd(topTotal),
                  tone:
                    topTotal == null
                      ? undefined
                      : topTotal >= 0
                        ? "safe"
                        : "breach",
                },
              ]}
            />
            <LightNote>
              Desks are ranked by how much money they have traded (volume); the
              figure on the right is each desk&apos;s profit so far. The full
              sortable table is under Details.
            </LightNote>
          </LightCard>
        ) : null
      }
      right={
        <span className="label-micro text-text-faint">
          {pageCohort.length ? (
            <>
              page {loaded}/{pageCohort.length} loaded
            </>
          ) : null}
        </span>
      }
    >
      {isLoading && !cohort.length ? (
        <PanelState kind="empty">Ranking desks…</PanelState>
      ) : !cohort.length ? (
        <PanelState kind="empty">No manager activity yet</PanelState>
      ) : (
        <>
          <div
            className={cn(
              GRID,
              "border-b border-hairline px-3 py-1.5 text-right",
            )}
          >
            <span className="label-micro text-left">#</span>
            <span className="label-micro text-left">Desk</span>
            {COLS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => onSort(c.key)}
                className={cn(
                  "label-micro text-right whitespace-nowrap transition-colors hover:text-text-sec",
                  sort.key === c.key && "text-foreground",
                )}
              >
                {c.label}
                {sort.key === c.key ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
              </button>
            ))}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {sorted.map((r) => (
              <Row
                key={r.managerId}
                r={r}
                mine={!!account && account.address === r.owner}
              />
            ))}
          </ScrollArea>

          <div className="flex shrink-0 items-center justify-between border-t border-hairline px-3 py-1.5 text-data tabular text-text-dim">
            <span className="truncate">
              {cohort.length} active desks · sorted by {sort.key}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <PageBtn
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                ← Prev
              </PageBtn>
              <span className="text-text-faint">
                {safePage + 1}/{pages}
              </span>
              <PageBtn
                disabled={safePage >= pages - 1}
                onClick={() => setPage(safePage + 1)}
              >
                Next →
              </PageBtn>
            </span>
          </div>
        </>
      )}
    </Panel>
  );
}

function Row({ r, mine }: { r: PageRow; mine: boolean }) {
  const s = r.s;
  return (
    <Link
      href={`/managers/${r.managerId}`}
      className={cn(
        GRID,
        "border-b border-hairline/40 px-3 py-1.5 text-right text-data tabular transition-colors hover:bg-panel-elev/50",
        mine && "bg-accent-brand/10",
      )}
    >
      <span className="text-left text-text-faint">{r.rank}</span>
      <span className="truncate text-left text-text-sec">
        {truncateAddr(r.owner)}
        {mine ? <span className="ml-1 text-accent-brand">you</span> : null}
      </span>
      <Pnl v={s?.realized_pnl} />
      <Pnl v={s?.unrealized_pnl} />
      <Pnl v={s ? s.realized_pnl + s.unrealized_pnl : undefined} />
      <Money v={s?.account_value} />
      <Money v={s?.open_exposure} />
      <span className="text-text-dim">{s ? s.open_positions : "·"}</span>
      <span className="text-text-dim">{fmtUsdCompact(u(r.volume))}</span>
    </Link>
  );
}

function Pnl({ v }: { v?: number }) {
  if (v == null) return <span className="text-text-faint">·</span>;
  return (
    <span className={v >= 0 ? "text-safe" : "text-breach"}>{signedUsd(v)}</span>
  );
}

function Money({ v }: { v?: number }) {
  if (v == null) return <span className="text-text-faint">·</span>;
  return <span className="text-text-sec">{fmtUsdCompact(u(v))}</span>;
}

function PageBtn({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded border border-hairline px-1.5 py-0.5 transition-colors",
        disabled
          ? "text-text-faint/50"
          : "text-text-dim hover:border-divider hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
