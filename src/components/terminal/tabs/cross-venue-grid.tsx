import { ComposabilityPanel } from "../xvenue/composability-panel";
import { VolArbPanel } from "../xvenue/vol-arb-panel";
import { VrpPanel } from "../xvenue/vrp-panel";

/** Cross-Venue: Predict's surface against the outside world — the vol-arb spread
 *  vs Deribit DVOL, the realized-vs-implied vol-risk-premium (Binance), and the
 *  on-chain DeepBook stack (margin borrow rate + spot CLOB) that the PLP vault
 *  composes with. The only tab that reaches off-protocol and cross-primitive. */
export function CrossVenueGrid() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-hairline lg:grid-cols-2 lg:grid-rows-2">
      <VolArbPanel className="min-h-[320px] lg:min-h-0" />
      <VrpPanel className="min-h-[320px] lg:min-h-0" />
      <ComposabilityPanel className="min-h-[320px] lg:col-span-2 lg:min-h-0" />
    </div>
  );
}
