import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const merge = extendTailwindMerge({
  extend: { classGroups: { shadow: [{ shadow: ["surface-1", "surface-2"] }] } },
})

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}
