"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

// Cache at second resolution so getSnapshot returns a stable value between
// ticks (React requires a cached snapshot to avoid an update loop).
let cached = 0;
function getSnapshot() {
  const t = Math.floor(Date.now() / 1000) * 1000;
  if (t !== cached) cached = t;
  return cached;
}

function getServerSnapshot() {
  return 0;
}

/** Current time (ms, second resolution), updated every second. SSR-safe. */
export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
