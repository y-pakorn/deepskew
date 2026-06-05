import { RndPanel } from "../vol/rnd-panel";
import { SkewTermPanel } from "../vol/skew-term-panel";
import { SmileDynamicsPanel } from "../vol/smile-dynamics-panel";
import { SmileIvPanel } from "../vol/smile-iv-panel";

/** Vol Analytics — the four faces of the vol surface: the smile (across
 *  strikes), the term structure (across expiries), the implied distribution
 *  (RND), and how the smile is moving (skew over time). */
export function VolAnalyticsGrid() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-hairline lg:grid-cols-2 lg:grid-rows-2">
      <SmileIvPanel className="min-h-[340px] lg:min-h-0" />
      <SkewTermPanel className="min-h-[340px] lg:min-h-0" />
      <RndPanel className="min-h-[340px] lg:min-h-0" />
      <SmileDynamicsPanel className="min-h-[340px] lg:min-h-0" />
    </div>
  );
}
