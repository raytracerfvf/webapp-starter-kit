import { PendingState } from "@/components/router/pending-state"
import { Skeleton } from "@/components/ui/skeleton"
import { pageWidth, surface } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

export function NoteDetailSkeleton() {
  return (
    <PendingState className={cn(pageWidth, "py-16")}>
      <div className={cn(surface, "mx-auto max-w-3xl space-y-8 p-6")}>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </PendingState>
  )
}
