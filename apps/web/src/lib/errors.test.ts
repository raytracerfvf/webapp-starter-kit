import { describe, expect, it, vi } from "vitest"

import { decodeHttpError, shouldRetryQuery } from "./errors"
import { HttpError } from "./errors.server"
import { sanitizeBoundaryError } from "./middleware/sanitize-error.server"

vi.mock("./middleware/request-context.server", () => ({
  getRequestLogger: () => ({ warn: vi.fn(), error: vi.fn() }),
}))

describe("decodeHttpError", () => {
  it("decodes an error carrying the transported HttpError fields", () => {
    const error = Object.assign(new Error("Unauthenticated"), {
      statusCode: 401,
      code: "UNAUTHENTICATED",
    })
    expect(decodeHttpError(error)).toEqual({
      statusCode: 401,
      code: "UNAUTHENTICATED",
    })
  })

  it("decodes what the server-function guard actually throws", () => {
    let sanitized: unknown
    try {
      sanitizeBoundaryError(
        new HttpError("Session expired", 401, "UNAUTHORIZED"),
        "serverFn",
      )
    } catch (error) {
      sanitized = error
    }
    expect(decodeHttpError(sanitized)).toEqual({
      statusCode: 401,
      code: "UNAUTHORIZED",
    })
  })

  it("returns null for anything without a numeric statusCode", () => {
    expect(decodeHttpError(new Error("boom"))).toBeNull()
    expect(decodeHttpError({ statusCode: "401" })).toBeNull()
    expect(decodeHttpError(undefined)).toBeNull()
  })
})

describe("shouldRetryQuery", () => {
  const withStatus = (statusCode: number) =>
    Object.assign(new Error("rejected"), { statusCode })

  it("never retries expected client errors", () => {
    expect(shouldRetryQuery(0, withStatus(401))).toBe(false)
    expect(shouldRetryQuery(0, withStatus(404))).toBe(false)
    expect(shouldRetryQuery(0, withStatus(400))).toBe(false)
  })

  it("retries network and 5xx failures up to three times", () => {
    expect(shouldRetryQuery(0, new Error("fetch failed"))).toBe(true)
    expect(shouldRetryQuery(2, withStatus(502))).toBe(true)
    expect(shouldRetryQuery(3, new Error("fetch failed"))).toBe(false)
  })

  it("never retries during SSR", () => {
    vi.stubGlobal("window", undefined)
    try {
      expect(shouldRetryQuery(0, new Error("fetch failed"))).toBe(false)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
