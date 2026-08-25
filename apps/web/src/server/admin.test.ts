import { describe, expect, it, vi } from "vitest"
import { ZodError } from "zod"

vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-start")>()
  const { createServerFnRecorder } = await import("./test-boundary-recorder")
  return { ...actual, createServerFn: createServerFnRecorder }
})

vi.mock("@/lib/db.server", () => ({ db: {} }))
vi.mock("@/lib/auth/session.server", () => ({ readServerSession: vi.fn() }))
vi.mock("@/lib/middleware/request-context.server", () => ({
  getRequestLogger: () => ({ warn: vi.fn(), error: vi.fn() }),
  setRequestUserId: vi.fn(),
}))

import { requireAdminMiddleware } from "@/lib/auth/middleware"

import * as admin from "./admin"
import type { BoundaryRecord } from "./test-boundary-recorder"

const recordOf = (fn: unknown) => fn as unknown as BoundaryRecord

describe("admin server fn boundary", () => {
  it("attaches the admin middleware to every fn", () => {
    for (const fn of [admin.listAdminUsersFn, admin.getAdminUserDetailFn]) {
      expect(recordOf(fn).middleware).toContain(requireAdminMiddleware)
    }
  })

  it("validates every input with ZodError, the sanitizer's 400 path", () => {
    for (const fn of [admin.listAdminUsersFn, admin.getAdminUserDetailFn]) {
      const { validator } = recordOf(fn)
      expect(validator).toBeDefined()
      expect(() => validator?.({ nonsense: true })).toThrow(ZodError)
    }
  })

  it("stays a read-only GET surface — writes go through Better Auth", () => {
    expect(recordOf(admin.listAdminUsersFn).method).toBe("GET")
    expect(recordOf(admin.getAdminUserDetailFn).method).toBe("GET")
  })
})
