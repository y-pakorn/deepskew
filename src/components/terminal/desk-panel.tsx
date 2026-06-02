"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { Button } from "@/components/ui/button";
import { truncateAddr } from "@/lib/format";
import { Panel } from "./panel";
import { Stat } from "./stat";

export function DeskPanel({ className }: { className?: string }) {
  const account = useCurrentAccount();

  return (
    <Panel
      title="DESK"
      code="positions · settle"
      className={className}
      right={
        account ? (
          <span className="font-mono text-[11px] tabular text-text-dim">
            {truncateAddr(account.address)}
          </span>
        ) : null
      }
    >
      <div className="flex h-full flex-col">
        {account ? (
          <div className="space-y-1">
            <Stat label="positions" value="0 open" tone="dim" />
            <Stat label="realized PnL" value="—" tone="dim" />
            <p className="label-micro pt-2 leading-relaxed text-text-faint">
              positions, PnL sparkline & settlement leaderboard land in the Desk
              room · Days 14–16
            </p>
          </div>
        ) : (
          <p className="label-micro leading-relaxed text-text-dim">
            connect a wallet to view positions and claim settled payouts.
          </p>
        )}
        <div className="mt-auto pt-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            disabled
            title="redeem_permissionless keeper — Desk room"
          >
            Claim settled payout ▸
          </Button>
        </div>
      </div>
    </Panel>
  );
}
