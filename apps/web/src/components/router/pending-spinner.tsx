import { PendingState } from "@/components/router/pending-state"
import { LiquidDots } from "@/components/ui/liquid-dots"

export function DefaultPendingComponent() {
  return (
    <PendingState className="grid min-h-[40vh] place-items-center">
      <LiquidDots size="lg" className="text-primary" />
    </PendingState>
  )
}
