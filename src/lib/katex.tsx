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
import { cn } from "@/lib/utils";

/** Render a LaTeX string to KaTeX HTML (never throws — bad input renders red). */
export const renderMath = (tex: string, displayMode: boolean) =>
  katex.renderToString(tex, { throwOnError: false, displayMode, output: "html" });

/**
 * Render a string, typesetting inline `$…$` math with KaTeX and `` `…` ``
 * spans as mono code. A backslash-escaped `\$` is a literal dollar (currency),
 * not a math delimiter. Shared by the tooltip glossary (TipContent) and the
 * docs pages so there is one inline-math renderer.
 */
export function withInlineMath(text: string): ReactNode {
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

// Italic math glyphs (and the trailing paren) overhang their measured advance
// width, so leave a little ink room on each side beyond the content box.
const INK_INSET = 10;

/**
 * A centered display equation that shrinks to fit its box. KaTeX is em-based,
 * so we scale by font-size (not transform) — the layout reflows and the box
 * height follows, so the math never clips or scrolls. The needed scale is read
 * from an off-flow, always-full-size copy, which keeps the measurement stable
 * (no feedback loop) and survives late KaTeX web-font loads.
 */
export function MathBlock({
  tex,
  className,
  bare = false,
}: {
  tex: string;
  className?: string;
  /** Drop the bordered well so the block can sit inside a custom surface. */
  bare?: boolean;
}) {
  const html = useMemo(() => renderMath(tex, true), [tex]);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const meas = measureRef.current;
    if (!content || !meas) return;
    const fit = () => {
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
    <div
      className={cn(
        "relative overflow-hidden text-text",
        !bare && "rounded-md border border-hairline bg-panel-elev px-3 py-2",
        className,
      )}
    >
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
