"use client";

import {
  useOracleState,
  useRecentFlow,
  useSettlementStats,
  useVaultSummary,
} from "@/lib/indexer/hooks";
import { DUSDC_DECIMALS } from "@/lib/sui/constants";
import { fmtPctValue, fmtPrice, fmtUsdCompact, fromUnits } from "@/lib/format";
import { checkButterfly, decodeSvi, impliedVol, yearsToExpiry } from "@/lib/svi";
import { cn } from "@/lib/utils";
import { useMarket } from "./market-context";
import { Pill } from "./pill";

function Item({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "key" | "up" | "down";
}) {
  return (
    <div className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
      <span className="label-micro">{label}</span>
      <span
        className={cn(
          "text-val tabular",
          tone === "key"
            ? "font-medium text-foreground"
            : tone === "up"
              ? "text-safe"
              : tone === "down"
                ? "text-breach"
                : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Headline market stats — at-a-glance density under the command bar. */
export function Ticker() {
  const { selectedOracleId } = useMarket();
  const { data: state } = useOracleState(selectedOracleId);
  const { data: vault } = useVaultSummary();
  const { items } = useRecentFlow(80);
  const stats = useSettlementStats();

  const spot = state?.latest_price?.spot ?? null;
  let atmIV: number | null = null;
  let arbFree: boolean | null = null;
  if (state?.latest_svi && state.oracle) {
    const p = decodeSvi(state.latest_svi);
    const T = yearsToExpiry(
      state.oracle.expiry,
      state.latest_svi.checkpoint_timestamp_ms,
    );
    if (T > 0) atmIV = impliedVol(0, p, T) * 100;
    arbFree = checkButterfly(p).butterflyFree;
  }
  const vol = items
    .filter((i) => i.kind === "mint")
    .reduce((s, m) => s + m.amount, 0);

  return (
    <div className="flex items-center gap-5 overflow-x-auto border-b border-hairline bg-canvas px-3 py-2">
      <Item label="spot" value={spot != null ? fmtPrice(spot) : "—"} tone="key" />
      <Item
        label="ATM IV"
        value={atmIV != null ? fmtPctValue(atmIV) : "—"}
        tone="key"
      />
      <Item
        label="24h prem vol"
        value={fmtUsdCompact(fromUnits(vol, DUSDC_DECIMALS))}
      />
      <Item
        label="taker win"
        value={stats.total ? `${stats.winRate.toFixed(0)}%` : "—"}
        tone={stats.total ? (stats.winRate < 50 ? "up" : "down") : "default"}
      />
      <Item
        label="PLP"
        value={vault ? `$${vault.plp_share_price.toFixed(4)}` : "—"}
      />
      <Item
        label="vault"
        value={
          vault ? fmtUsdCompact(fromUnits(vault.vault_value, DUSDC_DECIMALS)) : "—"
        }
      />
      {arbFree != null ? (
        <Pill tone={arbFree ? "up" : "down"} className="shrink-0">
          {arbFree ? "arb-free ✓" : "arb ✕"}
        </Pill>
      ) : null}
    </div>
  );
}
