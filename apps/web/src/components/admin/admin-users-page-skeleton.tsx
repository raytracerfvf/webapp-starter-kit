import { Skeleton } from "@/components/ui/skeleton"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

export function AdminUsersPageSkeleton() {
  return (
    <main className={cn(pageWidth, "py-16")}>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-10 w-48" />
      <div className="mt-10 grid gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </main>
  )
}
