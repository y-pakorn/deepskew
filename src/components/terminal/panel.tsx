import { cn } from "@/lib/utils";

/**
 * A hairline-tiled desk panel: micro-label header + content body.
 * Place panels inside a `gap-px bg-hairline` grid so the 1px gaps read as
 * dividers (density from tiling, not boxes).
 */
export function Panel({
  title,
  code,
  right,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  code?: string;
  right?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-h-0 flex-col bg-panel", className)}>
      <header className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-hairline px-3">
        <div className="flex items-baseline gap-2 truncate">
          <span className="label-micro text-text-sec">{title}</span>
          {code ? <span className="label-micro text-text-faint">{code}</span> : null}
        </div>
        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-auto p-3", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
