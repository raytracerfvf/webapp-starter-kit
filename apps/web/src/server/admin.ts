import { createServerFn } from "@tanstack/react-start"

import {
  AdminUserIdInputSchema,
  AdminUsersPageInputSchema,
  getAdminUserDetail,
  listAdminUsers,
} from "@repo/shared"

import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { db } from "@/lib/db.server"
import { throwNotFound } from "@/lib/errors.server"
import { zodValidator } from "@/lib/server-fn-validator"

// Reads only — role, ban, and impersonation writes go through Better Auth's
// own /api/auth admin endpoints.

export const listAdminUsersFn = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator(zodValidator(AdminUsersPageInputSchema))
  .handler(({ data }) => listAdminUsers(db, data))

export const getAdminUserDetailFn = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator(zodValidator(AdminUserIdInputSchema))
  .handler(async ({ data }) => {
    const detail = await getAdminUserDetail(db, data.userId)
    if (!detail) throwNotFound("User not found", { userId: data.userId })
    return detail
  })
