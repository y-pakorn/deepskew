import { LeaderboardPanel } from "../accounts/leaderboard-panel";
import { MarketHeader } from "../managers/market-header";

/** Managers: a market-wide activity strip over a full-width, sortable,
 *  paginated PnL-attribution leaderboard. Click any desk for its full account. */
export function ManagersGrid() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MarketHeader />
      <LeaderboardPanel className="min-h-0 flex-1" />
    </div>
  );
}
