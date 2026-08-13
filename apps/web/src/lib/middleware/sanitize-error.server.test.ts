import { notFound, redirect } from "@tanstack/react-router"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { HttpError } from "../errors.server"
import { sanitizeBoundaryError } from "./sanitize-error.server"

vi.mock("./request-context.server", () => ({
  getRequestLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

function capture(run: () => never): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  throw new Error("sanitizeBoundaryError returned instead of throwing")
}

describe("sanitizeBoundaryError", () => {
  it("passes redirects and notFound through untouched", () => {
    const redirectSignal = redirect({ to: "/" })
    expect(
      capture(() => sanitizeBoundaryError(redirectSignal, "serverFn")),
    ).toBe(redirectSignal)
    const notFoundSignal = notFound()
    expect(
      capture(() => sanitizeBoundaryError(notFoundSignal, "request")),
    ).toBe(notFoundSignal)
  })

  it("keeps statusCode and code as own enumerable properties with the stack stripped", () => {
    const thrown = capture(() =>
      sanitizeBoundaryError(
        new HttpError("Session expired", 401, "UNAUTHORIZED"),
        "serverFn",
      ),
    )
    expect(thrown).toBeInstanceOf(HttpError)
    expect(Object.entries(Object.getOwnPropertyDescriptors(thrown))).toEqual(
      expect.arrayContaining([
        [
          "statusCode",
          expect.objectContaining({ value: 401, enumerable: true }),
        ],
        [
          "code",
          expect.objectContaining({ value: "UNAUTHORIZED", enumerable: true }),
        ],
      ]),
    )
    expect(Object.hasOwn(thrown ?? {}, "stack")).toBe(false)
  })

  it("collapses ZodError to an opaque 400 without leaking issue text", () => {
    const zodError = z.object({ secretField: z.string() }).safeParse({}).error
    const thrown = capture(() => sanitizeBoundaryError(zodError, "serverFn"))
    expect(thrown).toBeInstanceOf(HttpError)
    if (thrown instanceof HttpError) {
      expect(thrown.statusCode).toBe(400)
      expect(thrown.code).toBe("VALIDATION_ERROR")
      expect(thrown.message).not.toContain("secretField")
    }
  })

  it("collapses unknown errors to an opaque message with no original text", () => {
    const thrown = capture(() =>
      sanitizeBoundaryError(
        new Error("connection to db-internal-host:5432 refused"),
        "serverFn",
      ),
    )
    expect(thrown).toBeInstanceOf(Error)
    if (thrown instanceof Error) {
      expect(thrown.message).toBe("An unexpected error occurred")
      expect(thrown.message).not.toContain("db-internal-host")
    }
  })
})
