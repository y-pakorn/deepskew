"use client";

import { useEffect, useRef } from "react";

/**
 * Flashes green (up) or red (down) for ~600ms when `value` changes, then settles
 * back to the element's own color. Imperative class-restart (reflow) so the CSS
 * animation replays on every tick without setState-in-effect.
 */
export function FlashValue({
  value,
  className,
  children,
}: {
  value: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const dir = value > prev.current ? "flash-up" : "flash-down";
    prev.current = value;
    const el = ref.current;
    if (!el) return;
    el.classList.remove("flash-up", "flash-down");
    void el.offsetWidth; // force reflow to restart the animation
    el.classList.add(dir);
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}
