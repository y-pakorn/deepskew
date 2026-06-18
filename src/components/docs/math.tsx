"use client";

import { FileCode2 } from "lucide-react";
import { MathBlock, renderMath } from "@/lib/katex";

/** Inline KaTeX for a single expression in prose: `<InlineMath tex="N(d_2)" />`. */
export function InlineMath({ tex }: { tex: string }) {
  return (
    <span
      className="text-text-sec"
      dangerouslySetInnerHTML={{ __html: renderMath(tex, false) }}
    />
  );
}

/**
 * A display equation rebuilt as a desk panel: a panel-header (cerulean tick +
 * name + a mono "where computed" source chip), the equation in a panel-elev
 * well, and a plain-English line under a hairline. When `readout` is supplied
 * (precomputed on the server from the live indexer snapshot), the value it
 * currently evaluates to sits beside the math, so the formula proves itself.
 */
export function Formula({
  tex,
  name,
  where,
  readout,
  children,
}: {
  tex: string;
  name?: string;
  where?: string;
  readout?: { label: string; value: string };
  children?: React.ReactNode;
}) {
  return (
    <figure className="overflow-hidden rounded-md border border-hairline bg-panel">
      {name || where ? (
        <figcaption className="flex h-8 items-center gap-2 border-b border-hairline px-3">
          <span
            aria-hidden="true"
            className="h-3.5 w-0.5 shrink-0 rounded-full bg-accent-brand"
          />
          {name ? <span className="panel-title">{name}</span> : null}
          {where ? (
            <code className="ml-auto inline-flex shrink-0 items-center gap-1 rounded bg-panel-elev px-1.5 py-0.5 font-mono text-data text-text-dim">
              <FileCode2 className="size-3 text-text-faint" aria-hidden="true" />
              {where}
            </code>
          ) : null}
        </figcaption>
      ) : null}

      <div className="bg-panel-elev px-4 py-4">
        {readout ? (
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
            <MathBlock tex={tex} bare />
            <div className="border-t border-hairline pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5 sm:text-right">
              <div className="label-micro text-text-dim">{readout.label}</div>
              <div className="mt-1 text-[1.75rem] leading-none font-medium tabular text-text">
                {readout.value}
              </div>
            </div>
          </div>
        ) : (
          <MathBlock tex={tex} bare />
        )}
      </div>

      {children ? (
        <figcaption className="border-t border-hairline px-4 py-3 text-[0.9375rem] leading-7 text-text-dim">
          {children}
        </figcaption>
      ) : null}
    </figure>
  );
}
