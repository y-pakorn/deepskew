"use client";

import { GLOSSARY, GLOSSARY_GROUPS, type TipEntry } from "@/lib/glossary";
import { MathBlock, withInlineMath } from "@/lib/katex";
import { IndexTick, slug } from "./doc-ui";

/** Full term reference, grouped by desk area, rendered from the same glossary
 *  that powers the in-app tooltips. Group headers use the desk panel-header
 *  grammar; each term anchors to `#term-<key>`. */
export function GlossaryReference() {
  return (
    <div className="flex flex-col gap-10">
      {GLOSSARY_GROUPS.map((group) => {
        const keys = group.keys.filter((k) => GLOSSARY[k]);
        return (
          <section key={group.title} id={slug(group.title)} className="scroll-mt-24">
            <div className="flex h-8 items-center gap-2 border-b border-hairline">
              <IndexTick className="h-3.5 w-0.5" />
              <h2 className="panel-title">{group.title}</h2>
              <span className="label-micro tabular ml-auto shrink-0 text-text-faint">
                {keys.length} terms
              </span>
            </div>
            <dl className="mt-1 flex flex-col">
              {keys.map((key) => (
                <Term key={key} id={key} entry={GLOSSARY[key] as TipEntry} />
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

function Term({ id, entry }: { id: string; entry: TipEntry }) {
  if (typeof entry === "string") {
    return (
      <div
        id={`term-${id}`}
        className="scroll-mt-24 border-b border-hairline/60 py-3 last:border-0"
      >
        <dt className="text-val font-medium text-text">{id}</dt>
        <dd className="mt-1 text-[0.9375rem] leading-7 text-text-dim">
          {withInlineMath(entry)}
        </dd>
      </div>
    );
  }
  return (
    <div
      id={`term-${id}`}
      className="scroll-mt-24 border-b border-hairline/60 py-3 last:border-0"
    >
      <dt className="text-val font-medium text-text">{withInlineMath(entry.title)}</dt>
      <dd className="mt-1 flex flex-col gap-2 text-[0.9375rem] leading-7 text-text-dim">
        <p>{withInlineMath(entry.body)}</p>
        {entry.math ? <MathBlock tex={entry.math} className="max-w-md" /> : null}
        {entry.points?.length ? (
          <ul className="flex flex-col gap-1">
            {entry.points.map((pt, i) => (
              <li key={i} className="flex gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-[0.62rem] size-1 shrink-0 rounded-[1px] bg-divider"
                />
                <span className="min-w-0">{withInlineMath(pt)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </dd>
    </div>
  );
}
