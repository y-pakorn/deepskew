import { Activity, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Centered empty / error state for a panel body — fills the available space so
 * a panel never shows a lone line of text floating at the top-left.
 */
export function PanelState({
  kind,
  className,
  children,
}: {
  kind: "empty" | "error";
  className?: string;
  children: React.ReactNode;
}) {
  const Icon = kind === "error" ? WifiOff : Activity;
  return (
    <div
      className={cn(
        "flex h-full min-h-[120px] flex-col items-center justify-center gap-2 px-4 text-center",
        className,
      )}
    >
      <Icon
        className={cn(
          "size-5",
          kind === "error" ? "text-breach/70" : "text-text-faint",
        )}
        strokeWidth={1.5}
      />
      <span
        className={cn(
          "label-micro",
          kind === "error" ? "text-breach" : "text-text-dim",
        )}
      >
        {children}
      </span>
    </div>
  );
}
