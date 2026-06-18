"use client";

import { createContext, useContext, useMemo, useState } from "react";

/** Display mode (value `light` is labelled "Noob" in the UI). `pro` is the full
 *  instrument; `light` folds every panel to a plain-language card and turns the
 *  action panels into simple forms (see <Panel light>). Not a color theme: same
 *  dark Tatem skin, same data, purely a presentation lens. */
export type Complexity = "light" | "pro";

const STORAGE_KEY = "deepskew:complexity";

interface ComplexityValue {
  mode: Complexity;
  setMode: (mode: Complexity) => void;
  toggle: () => void;
}

const ComplexityContext = createContext<ComplexityValue | null>(null);

/** Read the persisted choice. Guarded for SSR; defaults to `pro` so the dense
 *  terminal stays the first impression. Safe to call in a `useState` initializer
 *  because the desk only mounts client-side (DeskShell's hydration gate), so the
 *  server never renders against this value. */
function readStored(): Complexity {
  if (typeof window === "undefined") return "pro";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "pro";
}

export function ComplexityProvider({ children }: { children: React.ReactNode }) {
  const [mode, setStored] = useState<Complexity>(readStored);

  const value = useMemo<ComplexityValue>(() => {
    const setMode = (next: Complexity) => {
      setStored(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    };
    return {
      mode,
      setMode,
      toggle: () => setMode(mode === "pro" ? "light" : "pro"),
    };
  }, [mode]);

  return (
    <ComplexityContext.Provider value={value}>
      {children}
    </ComplexityContext.Provider>
  );
}

export function useComplexity(): ComplexityValue {
  const ctx = useContext(ComplexityContext);
  if (!ctx) {
    throw new Error("useComplexity must be used within <ComplexityProvider>");
  }
  return ctx;
}
