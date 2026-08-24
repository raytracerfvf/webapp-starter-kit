import { createMiddleware } from "@tanstack/react-start"

import { hasAdminRole } from "@repo/shared"

import { throwForbidden, throwUnauthorized } from "../errors.server"
import { setRequestUserId } from "../middleware/request-context.server"
import { readServerSession } from "./session.server"

export const requireAuthenticatedMiddleware = createMiddleware().server(
  async ({ next }) => {
    const session = await readServerSession()
    if (!session?.user.id) throwUnauthorized("Sign in is required")
    setRequestUserId(session.user.id)
    return next({ context: { userId: session.user.id, user: session.user } })
  },
)

export const requireAdminMiddleware = createMiddleware()
  .middleware([requireAuthenticatedMiddleware])
  .server(({ next, context }) => {
    if (!hasAdminRole(context.user)) throwForbidden("Admin access required")
    return next()
  })
