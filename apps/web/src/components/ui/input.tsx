import type { ComponentProps } from "react"

import { cn } from "@/lib/utils/cn"

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border bg-background px-3 text-sm",
        className,
      )}
      {...props}
    />
  )
}
