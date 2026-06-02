import type { StrikeBucket } from "@/lib/indexer/hooks";

/** Open-interest by strike (moneyness), UP stacked over DN, aligned to the
 *  smile's −30%…+30% axis. */
export function StrikeHistogram({ buckets }: { buckets: StrikeBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.up + b.dn));
  return (
    <div className="flex h-10 items-end gap-px">
      {buckets.map((b, i) => {
        const total = b.up + b.dn;
        const hPct = (total / max) * 100;
        const upFrac = total ? b.up / total : 0;
        return (
          <div
            key={i}
            className="flex flex-1 flex-col justify-end"
            title={`${(b.mid * 100).toFixed(0)}% · ${b.up} Up / ${b.dn} Dn`}
          >
            <div className="w-full" style={{ height: `${hPct}%` }}>
              <div
                className="w-full bg-safe/80"
                style={{ height: `${upFrac * 100}%` }}
              />
              <div
                className="w-full bg-breach/80"
                style={{ height: `${(1 - upFrac) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
