import { DeskPanel } from "../desk-panel";
import { OraclePanel } from "../oracle-panel";
import { SmilePanel } from "../smile-panel";
import { SurfacePanel } from "../surface-panel";
import { VaultPanel } from "../vault-panel";

/** The default desk: 3-D IV surface + smile + oracle state over the vault row
 *  and the live flow tape. Unchanged from the original single-screen layout. */
export function DeskGrid() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-hairline lg:grid-cols-[1.6fr_1fr_1fr] lg:grid-rows-[1.3fr_1fr]">
      <SurfacePanel className="min-h-[260px] lg:min-h-0" />
      <SmilePanel />
      <OraclePanel />
      <VaultPanel className="min-h-[220px] lg:col-span-2 lg:min-h-0" />
      <DeskPanel />
    </div>
  );
}
