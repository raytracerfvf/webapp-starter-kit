import { desc, eq, ilike, or, sql } from "drizzle-orm"

import type { DrizzleExecutor } from "../../db/client"
import { user } from "../../db/schema/auth.gen"
import { notes } from "../../db/schema/notes"
import {
  ADMIN_USERS_PAGE_SIZE,
  type AdminUsersPageInput,
  parseRoles,
  serializeRoles,
  UserRole,
} from "./types"

function escapeLikePattern(text: string): string {
  return text.replace(/[%_\\]/g, (char) => `\\${char}`)
}

function searchClause(q: string | undefined) {
  const trimmed = q?.trim()
  if (!trimmed) return undefined
  const pattern = `%${escapeLikePattern(trimmed)}%`
  return or(ilike(user.email, pattern), ilike(user.name, pattern))
}

// Expired bans are lifted lazily by Better Auth at next sign-in.
function isBanActive(
  banned: boolean | null,
  banExpires: Date | null,
  now: Date,
): boolean {
  return banned === true && (banExpires === null || banExpires > now)
}

type AdminUserRow = Pick<
  typeof user.$inferSelect,
  | "id"
  | "name"
  | "email"
  | "image"
  | "role"
  | "banned"
  | "banExpires"
  | "createdAt"
>

function projectAdminUserSummary(row: AdminUserRow, now: Date) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    roles: parseRoles(row.role),
    banned: isBanActive(row.banned, row.banExpires, now),
    createdAt: row.createdAt,
  }
}
export type AdminUserSummary = ReturnType<typeof projectAdminUserSummary>

export async function listAdminUsers(
  db: DrizzleExecutor,
  { page, q }: AdminUsersPageInput,
) {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(searchClause(q))
    .orderBy(desc(user.createdAt))
    .limit(ADMIN_USERS_PAGE_SIZE + 1)
    .offset((page - 1) * ADMIN_USERS_PAGE_SIZE)

  const now = new Date()
  return {
    items: rows
      .slice(0, ADMIN_USERS_PAGE_SIZE)
      .map((row) => projectAdminUserSummary(row, now)),
    hasMore: rows.length > ADMIN_USERS_PAGE_SIZE,
  }
}

export async function getAdminUserDetail(db: DrizzleExecutor, userId: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      notesCount: sql<number>`(select count(*)::int from ${notes}
        where ${notes.ownerId} = ${user.id} and ${notes.deletedAt} is null)`,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  if (!row) return null

  const { role, banned, ...rest } = row
  return {
    ...rest,
    roles: parseRoles(role),
    banned: isBanActive(banned, row.banExpires, new Date()),
  }
}
export type AdminUserDetail = NonNullable<
  Awaited<ReturnType<typeof getAdminUserDetail>>
>

// First-admin bootstrap (`pnpm admin:promote`); null when no user matches.
export async function grantAdminRoleByEmail(
  db: DrizzleExecutor,
  email: string,
) {
  const [row] = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)
  if (!row) return null

  await db
    .update(user)
    .set({ role: serializeRoles([...parseRoles(row.role), UserRole.ADMIN]) })
    .where(eq(user.id, row.id))
  return { id: row.id, email: row.email }
}
