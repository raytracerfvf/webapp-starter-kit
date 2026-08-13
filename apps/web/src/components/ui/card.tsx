import type { ComponentProps } from "react"

import { surface } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn(surface, "p-6", className)} {...props} />
}
