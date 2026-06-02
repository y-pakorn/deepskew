"use client";

import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { dAppKit } from "@/lib/sui/dapp-kit";

/**
 * Client-only dApp Kit boundary. Mount this via `next/dynamic` with
 * `{ ssr: false }` (wallet detection needs `window` + the Wallet Standard API,
 * which cannot run on the server) — see the official Next.js guide.
 */
export function DAppKitClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>;
}
