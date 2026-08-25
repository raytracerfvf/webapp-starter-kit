import { Skeleton } from "@/components/ui/skeleton"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

export function AdminUserDetailSkeleton() {
  return (
    <main className={cn(pageWidth, "py-16")}>
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-4 h-10 w-64" />
        <Skeleton className="mt-8 h-32 w-full" />
        <Skeleton className="mt-4 h-32 w-full" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    </main>
  )
}
