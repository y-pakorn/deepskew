"use client";

import type { TipEntry } from "@/lib/glossary";
import { MathBlock, withInlineMath } from "@/lib/katex";

/**
 * A structured, readable tooltip body: a title, a plain-English line, an
 * optional auto-fit equation, and precise detail bullets. Strings are rendered
 * as a bare description (graceful fallback for un-restructured entries). The
 * inline-math + equation rendering is shared with the docs pages via
 * `@/lib/katex`.
 */
export function TipContent({ doc }: { doc: TipEntry }) {
  if (typeof doc === "string") {
    return <p className="text-text-sec">{withInlineMath(doc)}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="font-medium leading-tight text-text">
        {withInlineMath(doc.title)}
      </div>
      <p className="leading-snug text-text-sec">{withInlineMath(doc.body)}</p>
      {doc.math ? <MathBlock tex={doc.math} /> : null}
      {doc.points?.length ? (
        <ul className="flex flex-col gap-0.5 leading-snug text-text-dim">
          {doc.points.map((pt, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden className="shrink-0 select-none text-text-faint">
                –
              </span>
              <span className="min-w-0">{withInlineMath(pt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
