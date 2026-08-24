import { createFileRoute } from "@tanstack/react-router"

import { AdminUserDetailPage } from "@/components/admin/admin-user-detail-page"
import { AdminUserDetailSkeleton } from "@/components/admin/admin-user-detail-skeleton"
import { adminUserDetailOptions } from "@/lib/queries/admin"

export const Route = createFileRoute("/_authenticated/admin/$userId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      adminUserDetailOptions(params.userId),
    )
  },
  pendingComponent: AdminUserDetailSkeleton,
  component: AdminUserDetailPage,
})
