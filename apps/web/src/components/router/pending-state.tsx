import type { ComponentProps } from "react"

import { m } from "@/i18n"

export function PendingState({ children, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} data-slot="pending-state" role="status" aria-atomic="true">
      {children}
      <span className="sr-only">{m.common_loading()}</span>
    </div>
  )
}
