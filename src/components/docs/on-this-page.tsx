"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  label: string;
}

/**
 * "On this page" rail — the content TOC. It reads the rendered section headings
 * straight from the DOM (every DocSection / glossary group renders a
 * `<section id>` with an `<h2>`), so it needs no per-page wiring, and highlights
 * the section nearest the top as you scroll via an IntersectionObserver.
 */
export function OnThisPage() {
  const pathname = usePathname();
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string>("");
  const visible = useRef<Set<string>>(new Set());

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("main section[id]"),
    );
    // Deriving the TOC from the rendered headings is inherently a post-render
    // DOM read, so this synchronous set-state in an effect is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(
      sections.map((s) => ({
        id: s.id,
        label: s.querySelector("h2")?.textContent?.trim() || s.id,
      })),
    );
    visible.current = new Set();
    setActive(sections[0]?.id ?? "");
    if (sections.length < 2) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.current.add(e.target.id);
          else visible.current.delete(e.target.id);
        }
        // active = first section (in document order) currently in the top band
        const first = sections.find((s) => visible.current.has(s.id));
        if (first) setActive(first.id);
      },
      // top band: a heading is "active" once it passes ~80px and until it
      // leaves the upper third of the viewport.
      { rootMargin: "-80px 0px -66% 0px", threshold: 0 },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [pathname]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="On this page" className="text-data">
      <div className="label-micro mb-2 text-text-faint">On this page</div>
      <ul className="flex flex-col">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={cn(
                "block border-l py-1 pl-3 leading-snug transition-colors",
                active === it.id
                  ? "border-accent-brand text-foreground"
                  : "border-hairline text-text-dim hover:border-divider hover:text-text-sec",
              )}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
