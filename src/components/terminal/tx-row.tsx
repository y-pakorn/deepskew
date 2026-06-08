import { explorerTx } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";

/**
 * A tape row that links to its on-chain transaction on Suiscan. Every flow,
 * settlement, whale and range event already carries its `digest`; this turns
 * "every number is verifiable on-chain" from a claim in the README into a
 * one-click action in the product. Renders the row as a grid `<a>`, so callers
 * pass the same `grid-cols-…` className the row used as a `<div>`.
 */
export function TxRow({
  digest,
  className,
  children,
}: {
  digest: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={explorerTx(digest)}
      target="_blank"
      rel="noopener noreferrer"
      title="View transaction on Suiscan"
      className={cn(
        "transition-colors hover:bg-panel-elev/70 focus-visible:bg-panel-elev focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </a>
  );
}
