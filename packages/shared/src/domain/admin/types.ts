import { z } from "zod"

// Better Auth's admin plugin stores roles as comma-separated text
// ("user,admin"), not a pgEnum — parse/serialize only through the helpers below.
export const USER_ROLES = ["user", "admin"] as const
export const UserRole = {
  USER: "user",
  ADMIN: "admin",
} as const satisfies Record<string, (typeof USER_ROLES)[number]>
export const UserRoleSchema = z.enum(USER_ROLES)
export type UserRole = z.infer<typeof UserRoleSchema>

export const DEFAULT_ROLE = UserRole.USER

export const ASSIGNABLE_ROLES: UserRole[] = USER_ROLES.filter(
  (role) => role !== DEFAULT_ROLE,
)

const ROLE_SET: ReadonlySet<string> = new Set(USER_ROLES)

// Unknown tokens, null, and "" decode to no roles rather than an error.
export function parseRoles(role: string | null | undefined): UserRole[] {
  return (role ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token): token is UserRole => ROLE_SET.has(token))
}

// Always retains the baseline so an account is never left role-less.
export function normalizeRoles(roles: UserRole[]): UserRole[] {
  return Array.from(new Set([DEFAULT_ROLE, ...roles]))
}

export function serializeRoles(roles: UserRole[]): string {
  return normalizeRoles(roles).join(",")
}

type MaybeUser = { role?: string | null | undefined } | null | undefined

// Never compare the raw column — equality fails for multi-role users.
export function hasRole(user: MaybeUser, role: UserRole): boolean {
  return parseRoles(user?.role).includes(role)
}

export function hasAdminRole(user: MaybeUser): boolean {
  return hasRole(user, UserRole.ADMIN)
}

export const ADMIN_USERS_PAGE_SIZE = 20
export const ADMIN_USERS_SEARCH_MAX_LENGTH = 200
export const ADMIN_BAN_REASON_MAX_LENGTH = 500

export const AdminUsersPageInputSchema = z.object({
  page: z.number().int().positive(),
  q: z.string().trim().max(ADMIN_USERS_SEARCH_MAX_LENGTH).optional(),
})
export type AdminUsersPageInput = z.infer<typeof AdminUsersPageInputSchema>

export const AdminUserIdInputSchema = z.object({
  userId: z.string().min(1),
})
export type AdminUserIdInput = z.infer<typeof AdminUserIdInputSchema>
