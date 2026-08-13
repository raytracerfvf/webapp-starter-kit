import "@tanstack/react-start/server-only"

import { isNotFound, isRedirect } from "@tanstack/react-router"
import { ZodError } from "zod"

import { HttpError } from "../errors.server"
import { getRequestLogger } from "./request-context.server"

// Shared policy for both error boundaries: upstream exception text never
// reaches a client.
export function sanitizeBoundaryError(
  error: unknown,
  scope: "request" | "serverFn",
): never {
  if (isRedirect(error) || isNotFound(error)) throw error
  if (error instanceof HttpError) {
    // Request-level responses never serialize the error object.
    if (scope === "request") throw error
    getRequestLogger().warn(
      { statusCode: error.statusCode, code: error.code },
      `[${scope}] rejected`,
    )
    // statusCode/code stay own enumerable properties — serialization transports
    // them and the client 401 recovery reads them.
    const sanitized = new HttpError(error.message, error.statusCode, error.code)
    delete sanitized.stack
    throw sanitized
  }
  if (error instanceof ZodError) {
    getRequestLogger().warn(
      { issues: error.issues },
      `[${scope}.validation] rejected`,
    )
    throw new HttpError("The request is invalid", 400, "VALIDATION_ERROR")
  }
  getRequestLogger().error({ error }, `[${scope}] failed`)
  const sanitized = new Error("An unexpected error occurred")
  delete sanitized.stack
  throw sanitized
}
