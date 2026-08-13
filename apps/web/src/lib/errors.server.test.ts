import { describe, expect, it, vi } from "vitest"

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }))

vi.mock("./middleware/request-context.server", () => ({
  getRequestLogger: () => ({ warn }),
}))

// isolate: false shares the evaluated-module cache across files in a worker;
// a prior file can evaluate errors.server bound to its own request-context
// mock, which this file's mock cannot reach. Re-evaluate the module graph so
// the import below binds the mock above (see AGENTS.md isolation policy).
vi.resetModules()
const { HttpError, throwForbidden, throwNotFound, throwUnauthorized } =
  await import("./errors.server")

function capture(run: () => never): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  throw new Error("helper returned instead of throwing")
}

describe("throw helpers", () => {
  it.each([
    [throwNotFound, 404, "NOT_FOUND"],
    [throwUnauthorized, 401, "UNAUTHENTICATED"],
    [throwForbidden, 403, "FORBIDDEN"],
  ] as const)("throws HttpError %#", (helper, statusCode, code) => {
    const thrown = capture(() => helper("Rejected"))
    expect(thrown).toBeInstanceOf(HttpError)
    if (thrown instanceof HttpError) {
      expect(thrown.statusCode).toBe(statusCode)
      expect(thrown.code).toBe(code)
      expect(thrown.message).toBe("Rejected")
    }
  })

  it("logs meta server-side without attaching it to the thrown error", () => {
    warn.mockClear()
    const thrown = capture(() =>
      throwNotFound("Note not found", { noteId: "note_1" }),
    )
    expect(warn).toHaveBeenCalledWith(
      { reason: "Note not found", noteId: "note_1" },
      "[notFound] rejected",
    )
    expect(Object.hasOwn(thrown ?? {}, "noteId")).toBe(false)
  })
})
