import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"

import { user } from "../../db/schema/auth.gen"
import { createTestDb, createTestUser, type TestDb } from "../../db/test-db"
import {
  getAdminUserDetail,
  grantAdminRoleByEmail,
  listAdminUsers,
} from "./operations"
import { ADMIN_USERS_PAGE_SIZE, UserRole } from "./types"

let db: TestDb

beforeAll(async () => {
  db = await createTestDb()
})

describe("listAdminUsers", () => {
  it("pages with hasMore from the size+1 fetch", async () => {
    for (let i = 0; i < ADMIN_USERS_PAGE_SIZE + 2; i++) {
      await createTestUser(db, `page-user-${String(i).padStart(2, "0")}`)
    }
    const first = await listAdminUsers(db, { page: 1 })
    expect(first.items).toHaveLength(ADMIN_USERS_PAGE_SIZE)
    expect(first.hasMore).toBe(true)

    const second = await listAdminUsers(db, { page: 2 })
    expect(second.items.length).toBeGreaterThan(0)
    expect(second.items.length).toBeLessThanOrEqual(ADMIN_USERS_PAGE_SIZE)
  })

  it("searches email and name case-insensitively", async () => {
    await createTestUser(db, "searchable")
    const byEmail = await listAdminUsers(db, { page: 1, q: "SEARCHABLE@" })
    expect(byEmail.items.map((u) => u.id)).toContain("searchable")
    const byName = await listAdminUsers(db, { page: 1, q: "User searchable" })
    expect(byName.items.map((u) => u.id)).toContain("searchable")
  })

  it("escapes like wildcards so % and _ match literally", async () => {
    await createTestUser(db, "percent%literal")
    const literal = await listAdminUsers(db, { page: 1, q: "percent%l" })
    expect(literal.items.map((u) => u.id)).toContain("percent%literal")
    // Unescaped, "p_rcent" would match via the _ wildcard.
    const wildcard = await listAdminUsers(db, { page: 1, q: "p_rcent" })
    expect(wildcard.items).toHaveLength(0)
  })

  it("parses roles and reports only active bans", async () => {
    await createTestUser(db, "flagged")
    const past = new Date(Date.now() - 60_000)
    await db
      .update(user)
      .set({ role: "user,admin", banned: true, banExpires: past })
      .where(eq(user.id, "flagged"))
    const page = await listAdminUsers(db, { page: 1, q: "flagged" })
    const flagged = page.items.find((u) => u.id === "flagged")
    expect(flagged?.roles).toEqual([UserRole.USER, UserRole.ADMIN])
    expect(flagged?.banned).toBe(false)

    await db
      .update(user)
      .set({ banExpires: null })
      .where(eq(user.id, "flagged"))
    const active = await listAdminUsers(db, { page: 1, q: "flagged" })
    expect(active.items.find((u) => u.id === "flagged")?.banned).toBe(true)
  })
})

describe("getAdminUserDetail", () => {
  it("returns null for unknown users", async () => {
    expect(await getAdminUserDetail(db, "missing")).toBeNull()
  })

  it("projects an exact key set so new user columns cannot leak", async () => {
    await createTestUser(db, "detailed")
    const detail = await getAdminUserDetail(db, "detailed")
    expect(detail).not.toBeNull()
    expect(Object.keys(detail ?? {}).sort()).toEqual([
      "banExpires",
      "banReason",
      "banned",
      "createdAt",
      "email",
      "emailVerified",
      "id",
      "image",
      "name",
      "notesCount",
      "roles",
      "updatedAt",
    ])
    expect(detail?.notesCount).toBe(0)
  })
})

describe("grantAdminRoleByEmail", () => {
  it("returns null when no user matches", async () => {
    expect(await grantAdminRoleByEmail(db, "nobody@example.test")).toBeNull()
  })

  it("adds admin while preserving the baseline, idempotently", async () => {
    await createTestUser(db, "promoted")
    const first = await grantAdminRoleByEmail(db, "promoted@example.test")
    expect(first?.id).toBe("promoted")

    const again = await grantAdminRoleByEmail(db, "promoted@example.test")
    expect(again?.id).toBe("promoted")

    const detail = await getAdminUserDetail(db, "promoted")
    expect(detail?.roles).toEqual([UserRole.USER, UserRole.ADMIN])
  })
})
