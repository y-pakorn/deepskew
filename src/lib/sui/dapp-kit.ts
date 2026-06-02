import { createDAppKit } from "@mysten/dapp-kit-react";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SUI_GRPC_URL, SUI_NETWORK } from "./constants";

/**
 * Single dApp Kit instance (the new @mysten/dapp-kit-react 2.x model).
 * Testnet only. The Core-API client is a gRPC-web client; reads go through
 * `client.core.*`, writes are signed/executed via `dAppKit.signAndExecuteTransaction`.
 */
export const dAppKit = createDAppKit({
  networks: [SUI_NETWORK],
  defaultNetwork: SUI_NETWORK,
  createClient: (network) => new SuiGrpcClient({ network, baseUrl: SUI_GRPC_URL }),
});

// Register the instance type globally so hooks (useDAppKit, useCurrentClient, …)
// infer the correct network + client types without per-call generics.
// (Augment the react package, per the official Next.js guide.)
declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
