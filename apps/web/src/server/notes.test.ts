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

import { requireAuthenticatedMiddleware } from "@/lib/auth/middleware"

import * as notes from "./notes"
import type { BoundaryRecord } from "./test-boundary-recorder"

const recordOf = (fn: unknown) => fn as unknown as BoundaryRecord

describe("notes server fn boundary", () => {
  it("attaches the auth middleware to every owner-scoped fn", () => {
    for (const fn of [
      notes.listNotesFn,
      notes.createNoteFn,
      notes.updateNoteFn,
      notes.deleteNoteFn,
    ]) {
      expect(recordOf(fn).middleware).toContain(requireAuthenticatedMiddleware)
    }
  })

  it("keeps the public read anonymous — visibility is decided in the operation", () => {
    expect(recordOf(notes.getNoteByPublicIdFn).middleware).not.toContain(
      requireAuthenticatedMiddleware,
    )
  })

  it("validates every input-taking fn with ZodError, the sanitizer's 400 path", () => {
    for (const fn of [
      notes.getNoteByPublicIdFn,
      notes.createNoteFn,
      notes.updateNoteFn,
      notes.deleteNoteFn,
    ]) {
      const { validator } = recordOf(fn)
      expect(validator).toBeDefined()
      expect(() => validator?.({ nonsense: true })).toThrow(ZodError)
    }
  })

  it("uses GET for reads and POST for writes", () => {
    expect(recordOf(notes.listNotesFn).method).toBe("GET")
    expect(recordOf(notes.getNoteByPublicIdFn).method).toBe("GET")
    expect(recordOf(notes.createNoteFn).method).toBe("POST")
    expect(recordOf(notes.updateNoteFn).method).toBe("POST")
    expect(recordOf(notes.deleteNoteFn).method).toBe("POST")
  })
})
