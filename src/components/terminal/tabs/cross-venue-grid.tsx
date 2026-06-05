import { VolArbPanel } from "../xvenue/vol-arb-panel";
import { VrpPanel } from "../xvenue/vrp-panel";

/** Cross-Venue: Predict's surface against the outside world — the vol-arb spread
 *  vs Deribit DVOL and the realized-vs-implied vol-risk-premium (Binance). Each
 *  pairs a chart with a filling table. The only tab that reaches off-protocol. */
export function CrossVenueGrid() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-hairline lg:grid-rows-2">
      <VolArbPanel className="min-h-[320px] lg:min-h-0" />
      <VrpPanel className="min-h-[320px] lg:min-h-0" />
    </div>
  );
}
