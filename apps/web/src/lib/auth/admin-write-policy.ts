import { APIError } from "better-auth/api"
import { z } from "zod"

import {
  ADMIN_BAN_REASON_MAX_LENGTH,
  normalizeRoles,
  UserRoleSchema,
} from "@repo/shared"

// The admin plugin accepts any role string and unbounded banReason; these
// narrow its write endpoints to the app's role model (hooks.before in
// auth.server.ts).

const SetRoleBodySchema = z.object({
  userId: z.string().min(1),
  role: z.union([UserRoleSchema, z.array(UserRoleSchema)]),
})

const BanUserBodySchema = z.object({
  userId: z.string().min(1),
  banReason: z.string().max(ADMIN_BAN_REASON_MAX_LENGTH).optional(),
  banExpiresIn: z.number().positive().optional(),
})

export function enforceSetRolePolicy(
  body: unknown,
  actorUserId: string | null,
) {
  const parsed = SetRoleBodySchema.safeParse(body)
  if (!parsed.success) {
    throw new APIError("BAD_REQUEST", { message: "Invalid role payload" })
  }
  if (actorUserId !== null && parsed.data.userId === actorUserId) {
    throw new APIError("BAD_REQUEST", {
      message: "You cannot change your own role",
    })
  }
  return {
    ...parsed.data,
    role: normalizeRoles([parsed.data.role].flat()),
  }
}

export function enforceBanUserPolicy(body: unknown) {
  const parsed = BanUserBodySchema.safeParse(body)
  if (!parsed.success) {
    throw new APIError("BAD_REQUEST", { message: "Invalid ban payload" })
  }
  return parsed.data
}
