import type { ComponentProps } from "react"

import { cn } from "@/lib/utils/cn"

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-36 w-full resize-y rounded-md border bg-background p-3 text-sm",
        className,
      )}
      {...props}
    />
  )
}
