import { AttributionPanel } from "../plp/attribution-panel";
import { DrawdownPanel } from "../plp/drawdown-panel";
import { LimiterPanel } from "../plp/limiter-panel";
import { RiskReportPanel } from "../plp/risk-report-panel";
import { ScenarioPanel } from "../plp/scenario-panel";
import { SupplyPanel } from "../plp/supply-panel";

/** PLP Risk: the decomposition the single global vault number can't give —
 *  per-expiry exposure, a book-wide ±σ stress, LP exit capacity, the drawdown
 *  record, a graded exportable one-pager, and the funnel that turns the verdict
 *  into a real on-chain supply/withdraw. */
export function PlpRiskGrid() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-hairline lg:grid-cols-3 lg:grid-rows-2">
      <AttributionPanel className="min-h-[320px] lg:min-h-0" />
      <ScenarioPanel className="min-h-[320px] lg:min-h-0" />
      <SupplyPanel className="min-h-[380px] lg:min-h-0" />
      <DrawdownPanel className="min-h-[320px] lg:min-h-0" />
      <LimiterPanel className="min-h-[320px] lg:min-h-0" />
      <RiskReportPanel className="min-h-[360px] lg:min-h-0" />
    </div>
  );
}
