import { HealthPanel } from "../ops/health-panel";
import { PipelinesPanel } from "../ops/pipelines-panel";
import { SystemStatus } from "../ops/system-status";

/** Ops / Health — answers "is everything OK?": a system-status header (feeds,
 *  indexer, trading, head) over the per-feed and per-pipeline detail. */
export function OpsGrid() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SystemStatus />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-hairline lg:grid-cols-2">
        <HealthPanel className="min-h-[300px] lg:min-h-0" />
        <PipelinesPanel className="min-h-[300px] lg:min-h-0" />
      </div>
    </div>
  );
}
