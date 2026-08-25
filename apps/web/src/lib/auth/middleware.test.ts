import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/middleware/request-context.server", () => ({
  getRequestLogger: () => ({ warn: vi.fn(), error: vi.fn() }),
  setRequestUserId: vi.fn(),
}))
vi.mock("./session.server", () => ({ readServerSession: vi.fn() }))

import { HttpError } from "../errors.server"
import {
  requireAdminMiddleware,
  requireAuthenticatedMiddleware,
} from "./middleware"

// The middleware builder stores its server handler on .options.
interface ServerHandler {
  options: {
    middleware: ReadonlyArray<unknown>
    server: (input: {
      next: (result?: unknown) => unknown
      context: unknown
    }) => unknown
  }
}

const handlerOf = (middleware: unknown) => middleware as ServerHandler

function capture(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  throw new Error("helper returned instead of throwing")
}

describe("requireAdminMiddleware", () => {
  it("composes the authentication middleware", () => {
    expect(handlerOf(requireAdminMiddleware).options.middleware).toContain(
      requireAuthenticatedMiddleware,
    )
  })

  it("rejects authenticated non-admins with 403", () => {
    const next = vi.fn()
    const thrown = capture(() =>
      handlerOf(requireAdminMiddleware).options.server({
        next,
        context: { userId: "u1", user: { id: "u1", role: "user" } },
      }),
    )
    expect(thrown).toBeInstanceOf(HttpError)
    if (thrown instanceof HttpError) expect(thrown.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  it("passes admins through unchanged", () => {
    const next = vi.fn(() => "passed")
    const result = handlerOf(requireAdminMiddleware).options.server({
      next,
      context: { userId: "a1", user: { id: "a1", role: "user,admin" } },
    })
    expect(next).toHaveBeenCalledOnce()
    expect(result).toBe("passed")
  })
})
