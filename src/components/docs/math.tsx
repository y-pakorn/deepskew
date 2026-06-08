"use client";

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
 * A display equation with an optional name, a plain-English line, and a "where
 * computed" source pointer — the methodology page's building block.
 */
export function Formula({
  tex,
  name,
  where,
  children,
}: {
  tex: string;
  name?: string;
  where?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {name ? <div className="label-micro text-text-dim">{name}</div> : null}
      <MathBlock tex={tex} />
      {children ? (
        <p className="text-[0.9375rem] leading-7 text-text-dim">{children}</p>
      ) : null}
      {where ? (
        <div className="label-micro text-text-faint">
          Computed in{" "}
          <code className="font-mono text-text-dim">{where}</code>
        </div>
      ) : null}
    </div>
  );
}
