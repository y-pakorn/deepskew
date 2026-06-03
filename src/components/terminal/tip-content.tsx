"use client";

import "katex/dist/katex.min.css";
import katex from "katex";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TipEntry } from "@/lib/glossary";

const renderMath = (tex: string, displayMode: boolean) =>
  katex.renderToString(tex, { throwOnError: false, displayMode, output: "html" });

/**
 * Render a string, typesetting inline `$…$` math with KaTeX and `` `…` ``
 * spans as mono code. A backslash-escaped `\$` is a literal dollar (currency),
 * not a math delimiter.
 */
function withInlineMath(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let buf = "";
  let key = 0;
  const flush = () => {
    if (buf) {
      nodes.push(<span key={key++}>{buf}</span>);
      buf = "";
    }
  };
  for (let i = 0; i < text.length; ) {
    if (text[i] === "\\" && text[i + 1] === "$") {
      buf += "$";
      i += 2;
      continue;
    }
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) {
        flush();
        nodes.push(
          <code
            key={key++}
            className="rounded bg-canvas/60 px-1 font-mono text-[0.92em] text-text-sec"
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }
    if (text[i] === "$") {
      let j = i + 1;
      let math = "";
      while (j < text.length) {
        if (text[j] === "\\" && text[j + 1] === "$") {
          math += "$";
          j += 2;
          continue;
        }
        if (text[j] === "$") break;
        math += text[j];
        j += 1;
      }
      if (j < text.length) {
        flush();
        nodes.push(
          <span
            key={key++}
            dangerouslySetInnerHTML={{ __html: renderMath(math, false) }}
          />,
        );
        i = j + 1;
        continue;
      }
    }
    buf += text[i];
    i += 1;
  }
  flush();
  return nodes;
}

/**
 * A centered display equation that shrinks to fit its box. KaTeX is em-based,
 * so we scale by font-size (not transform) — the layout reflows and the box
 * height follows, so the math never clips or scrolls. The needed scale is read
 * from an off-flow, always-full-size copy, which keeps the measurement stable
 * (no feedback loop) and survives late KaTeX web-font loads.
 */
// Italic math glyphs (and the trailing paren) overhang their measured advance
// width, so leave a little ink room on each side beyond the content box.
const INK_INSET = 10;

function MathBlock({ tex }: { tex: string }) {
  const html = useMemo(() => renderMath(tex, true), [tex]);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const meas = measureRef.current;
    if (!content || !meas) return;
    const fit = () => {
      // content.clientWidth is the padded content area; the font-size scale
      // doesn't change it, so it's a stable target.
      const avail = content.clientWidth - INK_INSET;
      const natural = meas.getBoundingClientRect().width;
      setScale(natural > 0 ? Math.min(1, avail / natural) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(content);
    ro.observe(meas);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [html]);

  return (
    <div className="relative overflow-hidden rounded border border-hairline bg-canvas/50 px-2.5 py-1.5 text-text">
      {/* off-flow full-size copy → stable natural width to scale against */}
      <div
        ref={measureRef}
        aria-hidden
        className="invisible absolute left-0 top-0 w-max [&_.katex-display]:my-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {/* visible, centered, scaled by font-size so the box height follows */}
      <div
        ref={contentRef}
        className="flex justify-center [&_.katex-display]:my-0"
        style={{ fontSize: `${scale}em` }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/**
 * A structured, readable tooltip body: a title, a plain-English line, an
 * optional auto-fit equation, and precise detail bullets. Strings are rendered
 * as a bare description (graceful fallback for un-restructured entries).
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
