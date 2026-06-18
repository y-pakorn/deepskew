import { ArrowUpRight, ChevronRight, ExternalLink, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { truncateAddr } from "@/lib/format";
import { explorerObject } from "@/lib/sui/constants";
import { cn } from "@/lib/utils";
import { SkewSignature } from "./skew-signature";

/** kebab anchor id from a heading, for the TOC and deep links. */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The one cerulean motif that recurs across the manual the way the 2px active-tab
 * underline recurs across the desk: a nav active bar, a DocSection marker, a
 * Formula-header tick, the hero rule. Pass `h-3.5 w-0.5` (vertical) or
 * `h-px w-2` (horizontal) to size it.
 */
export function IndexTick({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("shrink-0 rounded-full bg-accent-brand", className)}
    />
  );
}

/** The reading article: a mono breadcrumb eyebrow, a Title-Case H1, a lead, and
 *  a hairline body rule. */
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
        <div className="mb-3 flex items-center gap-1.5">
          <SkewSignature variant="motif" className="size-4" />
          <span className="text-micro font-medium tracking-[0.16em] text-text-faint uppercase">
            Manual
          </span>
          <ChevronRight className="size-2.5 text-text-faint" aria-hidden="true" />
          <span className="text-micro tabular font-medium tracking-[0.16em] text-text-dim uppercase">
            {eyebrow}
          </span>
        </div>
      ) : null}
      <h1 className="text-[1.875rem] leading-tight font-medium tracking-tight text-text">
        {title}
      </h1>
      {lead ? (
        <p className="mt-3 text-[1.0625rem] leading-7 text-text-sec">{lead}</p>
      ) : null}
      <div className="mt-8 flex items-center gap-2" aria-hidden="true">
        <IndexTick className="h-px w-2" />
        <span className="h-px flex-1 bg-hairline" />
      </div>
      <div className="mt-8 flex flex-col gap-10">{children}</div>
    </article>
  );
}

/** A titled section with the desk's panel-header grammar: a cerulean tick, a
 *  Title-Case panel title, an optional right status slot, and a hover anchor. */
export function DocSection({
  title,
  children,
  id,
  status,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
  status?: React.ReactNode;
}) {
  const anchor = id ?? slug(title);
  return (
    <section id={anchor} className="scroll-mt-24">
      <div className="group flex h-8 items-center gap-2 border-b border-hairline">
        <IndexTick className="h-3.5 w-0.5" />
        <h2 className="panel-title">
          <a href={`#${anchor}`} className="transition-colors hover:text-foreground">
            {title}
          </a>
        </h2>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {status}
          <a
            href={`#${anchor}`}
            aria-label={`Link to ${title}`}
            className="label-micro tabular text-text-faint opacity-0 outline-none transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            #
          </a>
        </div>
      </div>
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
      <span
        aria-hidden="true"
        className="mt-[0.62rem] size-1 shrink-0 rounded-[1px] bg-divider"
      />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/** Walkthrough wrapper — the numbered steps connect along a hairline spine. */
export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="relative flex flex-col">{children}</ol>;
}

/** Numbered step for how-to walkthroughs. Render inside <Steps>. */
export function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="group relative flex gap-3 pb-5 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute top-6 left-3 bottom-0 w-px bg-hairline group-last:hidden"
      />
      <span className="relative z-10 mt-px flex size-6 shrink-0 items-center justify-center rounded-full border border-divider bg-panel text-data tabular font-medium text-text-sec">
        {n}
      </span>
      <div className="min-w-0 pt-0.5">
        <div className="text-val font-medium text-text">{title}</div>
        {children ? (
          <div className="mt-1 text-[0.9375rem] leading-7 text-text-dim">{children}</div>
        ) : null}
      </div>
    </li>
  );
}

type Tone = "accent" | "safe" | "warn" | "breach";
const calloutDot: Record<Tone, string> = {
  accent: "bg-accent-brand",
  safe: "bg-safe",
  warn: "bg-warn",
  breach: "bg-breach",
};
const calloutWord: Record<Tone, string> = {
  accent: "text-accent-brand",
  safe: "text-safe",
  warn: "text-warn",
  breach: "text-breach",
};
const calloutDefaultKicker: Record<Tone, string> = {
  accent: "Note",
  safe: "Safe",
  warn: "Caution",
  breach: "Warning",
};

/** A verdict-style aside: a tone dot + a tone kicker word + an optional title,
 *  on a plain panel. Color is the dot and the word, never a wash. */
export function Callout({
  title,
  tone = "accent",
  kicker,
  children,
}: {
  title?: string;
  tone?: Tone;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-hairline bg-panel px-4 py-3">
      <span
        aria-hidden="true"
        className={cn("mt-[0.5rem] size-1.5 shrink-0 rounded-full", calloutDot[tone])}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className={cn("label-micro font-medium", calloutWord[tone])}>
            {kicker ?? calloutDefaultKicker[tone]}
          </span>
          {title ? (
            <>
              <span className="text-text-faint" aria-hidden="true">·</span>
              <span className="label-micro text-text-sec">{title}</span>
            </>
          ) : null}
        </div>
        <div className="text-[0.9375rem] leading-7 text-text-dim">{children}</div>
      </div>
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

/** A Suiscan-linked, truncated on-chain id chip. `full` shows the whole id. */
export function SourceChip({
  id,
  label,
  full = false,
}: {
  id: string;
  label?: React.ReactNode;
  full?: boolean;
}) {
  return (
    <a
      href={explorerObject(id)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 rounded bg-panel-elev px-1.5 py-0.5 align-middle font-mono text-data text-text-dim outline-none transition-colors hover:text-text-sec focus-visible:text-text-sec focus-visible:ring-1 focus-visible:ring-accent-brand"
    >
      <span className="truncate">{label ?? (full ? id : truncateAddr(id, 10, 6))}</span>
      <ExternalLink className="size-3 shrink-0 text-text-faint" aria-hidden="true" />
    </a>
  );
}

type KeyValTone = "safe" | "warn" | "breach";
const keyValTone: Record<KeyValTone, string> = {
  safe: "text-safe",
  warn: "text-warn",
  breach: "text-breach",
};

/** A label → value/definition row (objects, params), tabular value column. */
export function KeyVal({
  k,
  children,
  mono = false,
  tone,
}: {
  k: React.ReactNode;
  children: React.ReactNode;
  mono?: boolean;
  tone?: KeyValTone;
}) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-4 border-b border-hairline/60 py-2 last:border-0">
      <div className="label-micro pt-0.5 text-text-dim">{k}</div>
      <div
        className={cn(
          "min-w-0 text-[0.9375rem] leading-6",
          mono && "tabular",
          tone ? keyValTone[tone] : "text-text-sec",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A card linking a view's doc to its live route — mirrors the desk nav icon. */
export function ViewCard({
  title,
  blurb,
  route,
  docHref,
  icon: Icon,
}: {
  title: string;
  blurb: string;
  route: string;
  docHref?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="group relative flex flex-col gap-2 bg-panel p-4 transition-colors hover:bg-panel-elev/60">
      <div className="flex items-center gap-2">
        {Icon ? (
          <Icon className="size-3.5 shrink-0 text-text-faint transition-colors group-hover:text-accent-brand" />
        ) : null}
        <div className="text-val font-medium text-text">{title}</div>
        <code className="ml-auto shrink-0 rounded bg-panel-elev px-1.5 py-0.5 font-mono text-micro text-text-dim">
          {route}
        </code>
      </div>
      <p className="flex-1 text-data leading-6 text-text-dim">{blurb}</p>
      <div className="flex items-center gap-3 text-data">
        {docHref ? (
          <DocLink href={docHref} className="font-medium">
            Read
          </DocLink>
        ) : null}
        <DocLink
          href={route}
          className="inline-flex items-center gap-0.5 font-medium text-text-dim hover:text-accent-brand"
        >
          Open
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </DocLink>
      </div>
    </div>
  );
}

export function Divider() {
  return <hr className="border-hairline" />;
}
