"use client";

import { useEffect, useState } from "react";
import {
  useDAppKit,
  useWalletConnection,
  useWallets,
  type UiWallet,
  type UiWalletAccount,
} from "@mysten/dapp-kit-react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  LoaderCircle,
  LogOut,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { truncateAddr } from "@/lib/format";
import { explorerAccount, SUI_NETWORK } from "@/lib/sui/constants";
import { useSuiName } from "@/lib/sui/use-sui-name";
import { cn } from "@/lib/utils";

const NETWORK_LABEL = SUI_NETWORK[0].toUpperCase() + SUI_NETWORK.slice(1);

/* Cerulean-tinted highlight — the desk's menu-hover language (see MarketSelector).
   `data-[highlighted]` is Radix's pointer/keyboard highlight; pair it with
   `focus` so both pointer and keyboard land on the same surface. */
const ITEM_HOVER =
  "cursor-pointer transition-colors focus:bg-accent-brand/15 focus:text-foreground data-[highlighted]:bg-accent-brand/15 data-[highlighted]:text-foreground";
const ITEM_HOVER_DANGER =
  "cursor-pointer text-breach transition-colors focus:bg-breach/15 focus:text-breach data-[highlighted]:bg-breach/15 data-[highlighted]:text-breach";

/**
 * Wallet authority control for the command strip. Disconnected → a connect
 * dialog that lists every detected Wallet-Standard wallet; connected → an
 * account menu (copy address, explorer, switch account, disconnect). Built on
 * dApp Kit 2.0 hooks + shadcn primitives so it stays literally on the Tatem
 * design system rather than the unstyleable `/ui` web components.
 */
export function ConnectWallet() {
  // Keep the union object intact — destructuring would drop the discriminated
  // narrowing that proves `account`/`wallet` are non-null when connected.
  const connection = useWalletConnection();

  if (connection.isConnected) {
    return (
      <AccountMenu account={connection.account} wallet={connection.wallet} />
    );
  }
  return <ConnectDialog reconnecting={connection.isReconnecting} />;
}

/* ── Disconnected: connect dialog ─────────────────────────────────────────── */

function ConnectDialog({ reconnecting }: { reconnecting: boolean }) {
  const wallets = useWallets();
  const dAppKit = useDAppKit();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  async function connect(wallet: UiWallet) {
    setPending(wallet.name);
    try {
      await dAppKit.connectWallet({ wallet });
      setOpen(false);
    } catch (err) {
      // User rejection or wallet error — surface it, keep the dialog open.
      const message =
        err instanceof Error ? err.message : "Could not connect wallet";
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Filled cerulean accent — the strip's one primary CTA, so it leads
            against the neutral MarketSelector / ⌘K chrome. Plain button (not
            shadcn Button) to stay literally on the Tatem accent tokens. */}
        <button
          type="button"
          disabled={reconnecting}
          className="inline-flex h-7 items-center gap-1.5 rounded border border-accent-brand bg-accent-brand px-2.5 text-data text-primary-foreground transition-colors hover:border-accent-brand/90 hover:bg-accent-brand/90 disabled:opacity-50 data-[state=open]:border-accent-brand/90 data-[state=open]:bg-accent-brand/90"
        >
          {reconnecting ? (
            <LoaderCircle className="size-3.5 animate-spin text-primary-foreground/80" />
          ) : (
            <Wallet className="size-3.5 text-primary-foreground/80" />
          )}
          {reconnecting ? "Connecting…" : "Connect wallet"}
        </button>
      </DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden border-hairline bg-panel p-0 sm:max-w-sm">
        <DialogHeader className="gap-1 border-b border-hairline p-5 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Connect a wallet
          </DialogTitle>
          <DialogDescription className="text-data text-text-dim">
            Choose a Sui wallet to use with DeepSkew on {NETWORK_LABEL}.
          </DialogDescription>
        </DialogHeader>

        {wallets.length > 0 ? (
          <ul className="flex flex-col gap-0.5 p-2">
            {wallets.map((wallet) => (
              <li key={wallet.name}>
                <button
                  type="button"
                  onClick={() => connect(wallet)}
                  disabled={pending !== null}
                  className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-panel-elev focus-visible:bg-panel-elev focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <WalletIcon wallet={wallet} className="size-7" />
                  <span className="flex-1 text-val font-medium text-foreground">
                    {wallet.name}
                  </span>
                  {pending === wallet.name ? (
                    <LoaderCircle className="size-4 animate-spin text-accent-brand" />
                  ) : (
                    <span className="text-data text-text-faint opacity-0 transition-opacity group-hover:opacity-100">
                      Connect
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <NoWallets />
        )}

        <p className="border-t border-hairline px-5 py-3 label-micro text-text-faint">
          We never move funds without your approval.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function NoWallets() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full border border-hairline bg-panel-elev">
        <Wallet className="size-4 text-text-dim" />
      </span>
      <div className="space-y-1">
        <p className="text-val font-medium text-foreground">
          No Sui wallet detected
        </p>
        <p className="text-data text-text-dim">
          Install a wallet extension, then reopen this dialog.
        </p>
      </div>
      <a
        href="https://slush.app/"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-panel-elev px-3 py-1.5 text-data font-medium text-text-sec transition-colors hover:border-accent-brand/40 hover:text-foreground"
      >
        Get Slush
        <ExternalLink className="size-3 text-text-faint" />
      </a>
    </div>
  );
}

/* ── Connected: account menu ──────────────────────────────────────────────── */

function AccountMenu({
  account,
  wallet,
}: {
  account: UiWalletAccount;
  wallet: UiWallet;
}) {
  const dAppKit = useDAppKit();
  const { data: suiName } = useSuiName(account.address);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
      toast.success("Address copied");
    } catch {
      toast.error("Couldn’t copy address");
    }
  }

  const otherAccounts = wallet.accounts.filter(
    (a) => a.address !== account.address,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Wallet"
          className="inline-flex h-7 items-center gap-1.5 rounded border border-hairline bg-panel px-2 text-data text-text-sec transition-colors hover:border-accent-brand/40 hover:bg-panel-elev hover:text-foreground data-[state=open]:border-accent-brand/40 data-[state=open]:bg-panel-elev data-[state=open]:text-foreground"
        >
          <span className="size-1.5 rounded-full bg-safe shadow-[0_0_0_3px_color-mix(in_srgb,var(--safe)_22%,transparent)]" />
          {/* A SuiNS name is a name, not an address → Geist sans, not mono. */}
          <span
            className={cn(
              "text-foreground",
              suiName ? "font-medium" : "tabular",
            )}
          >
            {suiName ?? truncateAddr(account.address)}
          </span>
          <ChevronDown className="size-3 text-text-faint" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-64 border-hairline bg-panel-elev p-1.5"
      >
        {/* Identity — SuiNS name leads when set, else the wallet/account name */}
        <div className="flex items-center gap-2.5 px-2 py-2">
          <WalletIcon wallet={wallet} className="size-7" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-val font-medium text-foreground">
              {suiName ?? account.label ?? wallet.name}
            </p>
            <p className="flex items-center gap-1.5 text-data text-text-dim">
              <span className="size-1 rounded-full bg-safe" />
              {wallet.name} · {NETWORK_LABEL}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            copyAddress();
          }}
          className={cn(ITEM_HOVER, "gap-2")}
        >
          {copied ? (
            <Check className="size-4 text-safe" />
          ) : (
            <Copy className="size-4" />
          )}
          <span className="flex-1">Copy address</span>
          <span className="tabular text-data text-text-faint">
            {truncateAddr(account.address, 4, 4)}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className={cn(ITEM_HOVER, "gap-2")}>
          <a
            href={explorerAccount(account.address)}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="size-4" />
            <span className="flex-1">View on explorer</span>
          </a>
        </DropdownMenuItem>

        {otherAccounts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <p className="px-2 py-1 label-micro text-text-faint">
              Switch account
            </p>
            {otherAccounts.map((a) => (
              <DropdownMenuItem
                key={a.address}
                onSelect={() => dAppKit.switchAccount({ account: a })}
                className={cn(ITEM_HOVER, "gap-2")}
              >
                <WalletIcon wallet={wallet} className="size-4 rounded-sm" />
                <span className="tabular flex-1 text-text-sec">
                  {truncateAddr(a.address)}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => dAppKit.disconnectWallet()}
          className={cn(ITEM_HOVER_DANGER, "gap-2")}
        >
          <LogOut className="size-4 text-breach" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Shared ───────────────────────────────────────────────────────────────── */

function WalletIcon({
  wallet,
  className,
}: {
  wallet: UiWallet;
  className?: string;
}) {
  if (!wallet.icon) {
    return (
      <span
        className={cn(
          "grid place-items-center rounded-md border border-hairline bg-panel text-text-dim",
          className,
        )}
      >
        <Wallet className="size-3.5" />
      </span>
    );
  }
  return (
    // Wallet icons are Wallet-Standard data URIs — next/image can't optimize
    // these, so a plain <img> is correct here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wallet.icon}
      alt=""
      className={cn("rounded-md border border-hairline object-cover", className)}
    />
  );
}
