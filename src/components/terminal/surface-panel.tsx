import { cn } from "@/lib/utils";
import { Panel } from "./panel";

const EXPIRIES = ["1H", "2H", "4H", "1D"];

/**
 * The visual hero. The glowing 3-D react-three-fiber surface mounts here in the
 * Surface room (Days 3–8); for now an atmospheric, on-brand placeholder.
 */
export function SurfacePanel({ className }: { className?: string }) {
  return (
    <Panel
      title="IV SURFACE"
      code="BTC · SVI"
      className={className}
      right={<span className="label-micro text-text-faint">hero</span>}
      bodyClassName="relative p-0"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-2/3 opacity-20"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, var(--sky-from), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(var(--hairline) 1px, transparent 1px), linear-gradient(90deg, var(--hairline) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
            maskImage:
              "radial-gradient(75% 55% at 50% 42%, #000 25%, transparent 82%)",
            WebkitMaskImage:
              "radial-gradient(75% 55% at 50% 42%, #000 25%, transparent 82%)",
          }}
        />
        <div className="relative flex h-full flex-col items-center justify-center gap-2.5 px-4 text-center">
          <span className="font-mono text-2xl font-medium tracking-tight text-foreground">
            live vol surface
          </span>
          <span className="label-micro max-w-[30ch] leading-relaxed">
            glowing 3-D implied-vol surface · pulses cerulean on each oracle tick
          </span>
          <span className="rounded-full border border-hairline px-2 py-0.5 label-micro text-text-faint">
            Surface room · Days 3–8
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-hairline bg-canvas/60 px-3 py-1.5 backdrop-blur-sm">
          <span className="label-micro">expiry</span>
          {EXPIRIES.map((e, i) => (
            <span
              key={e}
              className={cn(
                "font-mono text-[11px] tabular",
                i === 0 ? "text-accent-brand" : "text-text-dim",
              )}
            >
              {e}
            </span>
          ))}
          <span className="ml-auto label-micro text-text-faint">⟵ scrub ⟶</span>
        </div>
      </div>
    </Panel>
  );
}
