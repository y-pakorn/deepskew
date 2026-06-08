import Link from "next/link";
import { cn } from "@/lib/utils";

/** kebab anchor id from a heading, for the TOC and deep links. */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The reading article: an eyebrow, a Title-Case H1, and a lead paragraph. */
export function DocArticle({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="min-w-0 pb-24">
      {eyebrow ? (
        <div className="label-micro mb-2 tracking-[0.14em] text-accent-brand uppercase">
          {eyebrow}
        </div>
      ) : null}
      <h1 className="text-[1.875rem] leading-tight font-medium tracking-tight text-text">
        {title}
      </h1>
      {lead ? (
        <p className="mt-3 text-[1.0625rem] leading-7 text-text-sec">{lead}</p>
      ) : null}
      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </article>
  );
}

/** A titled section with a hairline rule and a stable anchor for the TOC. */
export function DocSection({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  const anchor = id ?? slug(title);
  return (
    <section id={anchor} className="scroll-mt-20">
      <h2 className="group flex items-center gap-2 border-b border-hairline pb-2 text-lead font-medium tracking-tight text-text">
        <a href={`#${anchor}`} className="hover:text-accent-brand">
          {title}
        </a>
      </h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** Body paragraph. */
export function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[0.9375rem] leading-7 text-text-dim", className)}>
      {children}
    </p>
  );
}

/** Bullet list. */
export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="flex flex-col gap-2 text-[0.9375rem] leading-7 text-text-dim">
      {children}
    </ul>
  );
}

export function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-text-faint" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/** Numbered step for how-to walkthroughs. */
export function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel-elev text-data tabular text-text-sec">
        {n}
      </span>
      <div className="min-w-0">
        <div className="text-val font-medium text-text">{title}</div>
        {children ? (
          <div className="mt-1 text-[0.9375rem] leading-7 text-text-dim">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

type Tone = "accent" | "safe" | "warn";
const calloutTone: Record<Tone, string> = {
  accent: "border-accent-brand/30 bg-accent-brand/[0.06]",
  safe: "border-safe/30 bg-safe/[0.06]",
  warn: "border-warn/30 bg-warn/[0.06]",
};

/** Highlighted aside (verify-in-60s, notes). */
export function Callout({
  title,
  tone = "accent",
  children,
}: {
  title?: string;
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border px-4 py-3", calloutTone[tone])}>
      {title ? (
        <div className="mb-1 text-val font-medium text-text">{title}</div>
      ) : null}
      <div className="text-[0.9375rem] leading-7 text-text-dim">{children}</div>
    </div>
  );
}

/** Inline mono chip for a file path, identifier, or function. */
export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-panel-elev px-1.5 py-0.5 font-mono text-[0.85em] text-text-sec">
      {children}
    </code>
  );
}

/** A cerulean link — internal via next/link, external opens in a new tab. */
export function DocLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const external = /^https?:\/\//.test(href);
  const cls = cn(
    "text-accent-brand underline-offset-2 transition-colors hover:underline",
    className,
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** A label → value/definition row (objects, params), tabular value column. */
export function KeyVal({
  k,
  children,
}: {
  k: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b border-hairline/60 py-1.5 last:border-0">
      <div className="label-micro pt-0.5 text-text-dim">{k}</div>
      <div className="min-w-0 text-[0.9375rem] leading-6 text-text-sec">{children}</div>
    </div>
  );
}

/** A card linking a view's doc to its live route. */
export function ViewCard({
  title,
  blurb,
  route,
  docHref,
}: {
  title: string;
  blurb: string;
  route: string;
  docHref?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-hairline bg-panel p-4 transition-colors hover:border-divider">
      <div className="text-val font-medium text-text">{title}</div>
      <p className="flex-1 text-data leading-6 text-text-dim">{blurb}</p>
      <div className="mt-1 flex items-center gap-3 text-data">
        {docHref ? (
          <DocLink href={docHref} className="font-medium">
            Read
          </DocLink>
        ) : null}
        <DocLink href={route} className="font-medium text-text-dim hover:text-accent-brand">
          Open ↗
        </DocLink>
      </div>
    </div>
  );
}

export function Divider() {
  return <hr className="border-hairline" />;
}
