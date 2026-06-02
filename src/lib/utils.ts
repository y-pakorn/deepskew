import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge our custom font-size utilities so it treats them as sizes,
// not colors. Without this it can't tell `text-val` from `text-{color}` and drops
// the size whenever a value combines a size + a color in one cn() call.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["micro", "label", "data", "val", "md", "lead", "hero"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
