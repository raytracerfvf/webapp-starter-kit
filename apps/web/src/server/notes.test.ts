import { describe, expect, it, vi } from "vitest"
import { ZodError } from "zod"

// The built fetcher hides its wiring, so createServerFn is replaced with a
// recorder and each export becomes an inspectable record of its chain.
vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-start")>()
  interface BoundaryRecord {
    method: string | undefined
    middleware: ReadonlyArray<unknown>
    validator: ((input: unknown) => unknown) | undefined
  }
  function builder(record: BoundaryRecord) {
    return {
      middleware(middleware: ReadonlyArray<unknown>) {
        return builder({ ...record, middleware })
      },
      validator(validator: (input: unknown) => unknown) {
        return builder({ ...record, validator })
      },
      handler() {
        return record
      },
    }
  }
  return {
    ...actual,
    createServerFn: (options?: { method?: string }) =>
      builder({
        method: options?.method,
        middleware: [],
        validator: undefined,
      }),
  }
})

vi.mock("@/lib/db.server", () => ({ db: {} }))
vi.mock("@/lib/auth/session.server", () => ({ readServerSession: vi.fn() }))
vi.mock("@/lib/middleware/request-context.server", () => ({
  getRequestLogger: () => ({ warn: vi.fn(), error: vi.fn() }),
  setRequestUserId: vi.fn(),
}))

import { requireAuthenticatedMiddleware } from "@/lib/auth/middleware"

import * as notes from "./notes"

interface BoundaryRecord {
  method: string | undefined
  middleware: ReadonlyArray<unknown>
  validator: ((input: unknown) => unknown) | undefined
}

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
    expect(recordOf(notes.getNoteByPublicIdFn).middleware).toHaveLength(0)
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
