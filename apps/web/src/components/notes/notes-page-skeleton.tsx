import { PendingState } from "@/components/router/pending-state"
import { Skeleton } from "@/components/ui/skeleton"
import { pageWidth, surface } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

const notePlaceholders = ["first", "second", "third"] as const

export function NotesPageSkeleton() {
  return (
    <PendingState className={cn(pageWidth, "py-16")}>
      <section>
        <Skeleton className="h-4 w-24" />
        <div className="mt-3 flex items-center justify-between gap-4">
          <Skeleton className="h-14 w-2/3" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="mt-10 grid gap-3">
          {notePlaceholders.map((placeholder) => (
            <div key={placeholder} className={cn(surface, "space-y-4 p-6")}>
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </section>
    </PendingState>
  )
}
