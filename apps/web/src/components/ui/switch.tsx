import { Switch as SwitchPrimitive } from "radix-ui"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils/cn"

export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-6 w-11 rounded-full bg-muted data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-[1.35rem] data-[state=checked]:bg-primary-foreground" />
    </SwitchPrimitive.Root>
  )
}
