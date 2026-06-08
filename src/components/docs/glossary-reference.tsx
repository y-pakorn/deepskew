"use client";

import { GLOSSARY, GLOSSARY_GROUPS, type TipEntry } from "@/lib/glossary";
import { MathBlock, withInlineMath } from "@/lib/katex";
import { slug } from "./doc-ui";

/** Full term reference, grouped by desk area, rendered from the same glossary
 *  that powers the in-app tooltips. Each term anchors to `#term-<key>`. */
export function GlossaryReference() {
  return (
    <div className="flex flex-col gap-10">
      {GLOSSARY_GROUPS.map((group) => (
        <section key={group.title} id={slug(group.title)} className="scroll-mt-20">
          <h2 className="border-b border-hairline pb-2 text-lead font-medium tracking-tight text-text">
            {group.title}
          </h2>
          <dl className="mt-4 flex flex-col gap-5">
            {group.keys.map((key) => {
              const entry = GLOSSARY[key] as TipEntry | undefined;
              if (!entry) return null;
              return <Term key={key} id={key} entry={entry} />;
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}

function Term({ id, entry }: { id: string; entry: TipEntry }) {
  if (typeof entry === "string") {
    return (
      <div id={`term-${id}`} className="scroll-mt-20">
        <dt className="text-val font-medium text-text">{id}</dt>
        <dd className="mt-1 text-[0.9375rem] leading-7 text-text-dim">
          {withInlineMath(entry)}
        </dd>
      </div>
    );
  }
  return (
    <div id={`term-${id}`} className="scroll-mt-20">
      <dt className="text-val font-medium text-text">{withInlineMath(entry.title)}</dt>
      <dd className="mt-1 flex flex-col gap-2 text-[0.9375rem] leading-7 text-text-dim">
        <p>{withInlineMath(entry.body)}</p>
        {entry.math ? <MathBlock tex={entry.math} className="max-w-md" /> : null}
        {entry.points?.length ? (
          <ul className="flex flex-col gap-1">
            {entry.points.map((pt, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-text-faint" />
                <span className="min-w-0">{withInlineMath(pt)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </dd>
    </div>
  );
}
