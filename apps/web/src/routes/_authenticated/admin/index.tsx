import { createFileRoute } from "@tanstack/react-router"

import { AdminUsersPage } from "@/components/admin/admin-users-page"
import { AdminUsersPageSkeleton } from "@/components/admin/admin-users-page-skeleton"
import { AdminUsersSearchSchema } from "@/lib/constants/search"
import { adminUsersPageOptions } from "@/lib/queries/admin"

export const Route = createFileRoute("/_authenticated/admin/")({
  validateSearch: AdminUsersSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1, q: search.q }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(adminUsersPageOptions(deps))
  },
  pendingComponent: AdminUsersPageSkeleton,
  component: AdminUsersPage,
})
