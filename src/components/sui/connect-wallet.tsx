"use client";

import {
  useCurrentAccount,
  useDAppKit,
  useWallets,
} from "@mysten/dapp-kit-react";
import { Button } from "@/components/ui/button";
import { truncateAddr } from "@/lib/format";

/**
 * Minimal on-brand wallet button using dApp Kit hooks. Connects to the first
 * detected wallet; a full multi-wallet modal (ConnectModal) can come later.
 */
export function ConnectWallet() {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const dAppKit = useDAppKit();

  if (account) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 font-mono text-xs"
        onClick={() => dAppKit.disconnectWallet()}
        title="Disconnect"
      >
        <span className="size-1.5 rounded-full bg-safe" />
        {truncateAddr(account.address)}
      </Button>
    );
  }

  const first = wallets[0];
  return (
    <Button
      size="sm"
      className="h-7 text-xs"
      disabled={!first}
      onClick={() => first && dAppKit.connectWallet({ wallet: first })}
    >
      {first ? "Connect wallet" : "No wallet found"}
    </Button>
  );
}
