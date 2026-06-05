import { EdgeTapePanel } from "../flow/edge-tape-panel";
import { RangeFlowPanel } from "../flow/range-flow-panel";
import { SettlementPanel } from "../flow/settlement-panel";
import { WhaleFlowPanel } from "../flow/whale-flow-panel";

/** Flow & Edge: the model-vs-market edge the vault captures fill-by-fill, the
 *  settlement outcomes that ground it, notional-weighted whale flow, and the
 *  range product line. */
export function FlowEdgeGrid() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-hairline lg:grid-cols-[1.2fr_1fr] lg:grid-rows-2">
      <EdgeTapePanel className="min-h-[360px] lg:min-h-0" />
      <SettlementPanel className="min-h-[340px] lg:min-h-0" />
      <WhaleFlowPanel className="min-h-[360px] lg:min-h-0" />
      <RangeFlowPanel className="min-h-[360px] lg:min-h-0" />
    </div>
  );
}
