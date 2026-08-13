import { X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import type { ComponentProps } from "react"

import { m } from "@/i18n"
import { surfaceOverlay } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

export const Dialog = DialogPrimitive.Root

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          surfaceOverlay,
          "fixed left-1/2 top-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 p-6",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={m.common_close()}
          className="absolute right-4 top-4 rounded-sm p-1 hover:bg-muted"
        >
          <X size={18} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("t-title pr-8", className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-2 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}
