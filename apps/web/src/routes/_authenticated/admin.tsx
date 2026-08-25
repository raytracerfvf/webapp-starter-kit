import { createFileRoute, redirect } from "@tanstack/react-router"

import { hasAdminRole } from "@repo/shared"

export const Route = createFileRoute("/_authenticated/admin")({
  // UX only; requireAdminMiddleware is the security boundary.
  beforeLoad: ({ context }) => {
    if (!hasAdminRole(context.auth.user)) throw redirect({ to: "/" })
  },
})
