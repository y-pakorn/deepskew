"use client";

import { useMemo } from "react";
import { useActiveOracleMarks } from "@/lib/indexer/hooks";
import { fmtDuration } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { LabelTip } from "../label-tip";
import { Panel } from "../panel";
import { PanelState } from "../panel-state";

const STALE_MS = 30_000; // quote/mint reverts past the contract staleness window

type FeedState = "active" | "stale" | "pending";

/** Per-oracle feed freshness — one row per live BTC expiry, with a bar showing
 *  how close it is to the 30s stale window and how long since its last update.
 *  A stale or expired-unsettled feed is un-mintable. */
export function HealthPanel({ className }: { className?: string }) {
  const { marks, total } = useActiveOracleMarks();
  const now = useNow();

  const rows = useMemo(
    () =>
      [...marks.values()]
        .sort((a, b) => a.expiry - b.expiry)
        .map((m) => {
          const age = m.lastUpdateMs > 0 ? now - m.lastUpdateMs : Infinity;
          const state: FeedState =
            m.expiry <= now ? "pending" : age > STALE_MS ? "stale" : "active";
          return { ...m, age, state };
        }),
    [marks, now],
  );

  return (
    <Panel
      title="Oracle feeds"
      code="price / SVI · per expiry"
      className={className}
      bodyClassName="flex flex-col overflow-hidden p-0"
      right={
        <span className="label-micro text-text-faint">
          <span className="tabular">{total}</span> live
        </span>
      }
    >
      {!rows.length ? (
        <PanelState kind="empty">Resolving feeds…</PanelState>
      ) : (
        <>
          <div className="grid grid-cols-[5rem_1fr_4.5rem] items-center gap-3 border-b border-hairline px-3 py-1.5">
            <LabelTip k="expiry" className="label-micro">
              Expiry
            </LabelTip>
            <LabelTip k="feed-staleness" className="label-micro">
              Freshness · age vs 30s window
            </LabelTip>
            <span className="label-micro text-right">Updated</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {rows.map((r) => (
              <FeedRow
                key={r.oracleId}
                expiryLabel={
                  r.expiry > now ? fmtDuration(r.expiry - now) : "expired"
                }
                age={r.age}
                state={r.state}
              />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

function FeedRow({
  expiryLabel,
  age,
  state,
}: {
  expiryLabel: string;
  age: number;
  state: FeedState;
}) {
  const ageS =
    state === "pending"
      ? null
      : Number.isFinite(age)
        ? Math.max(0, Math.round(age / 1000))
        : null;
  const frac = ageS != null ? Math.min(1, ageS / 30) : 1;
  const tone =
    state === "active"
      ? "text-safe"
      : state === "stale"
        ? "text-warn"
        : "text-breach";
  const bar =
    state !== "active"
      ? "bg-breach"
      : frac < 0.6
        ? "bg-safe"
        : frac < 0.9
          ? "bg-warn"
          : "bg-breach";
  return (
    <div className="grid min-h-[2.25rem] flex-1 grid-cols-[5rem_1fr_4.5rem] items-center gap-3 border-b border-hairline/40 px-3 text-data tabular">
      <span className="text-val text-text-sec">{expiryLabel}</span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-elev">
        <div
          className={cn("h-full rounded-full transition-[width]", bar)}
          style={{ width: `${Math.max(4, frac * 100)}%` }}
        />
      </div>
      <span className={cn("text-right", tone)}>
        {state === "pending"
          ? "pending"
          : ageS != null
            ? `${ageS}s ago`
            : "no data"}
      </span>
    </div>
  );
}
