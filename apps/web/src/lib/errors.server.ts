import "@tanstack/react-start/server-only"

import { getRequestLogger } from "./middleware/request-context.server"

export class HttpError extends Error {
  readonly statusCode: number
  readonly code: string | undefined

  constructor(message: string, statusCode: number, code?: string) {
    super(message)
    this.name = "HttpError"
    this.statusCode = statusCode
    this.code = code
  }
}

/**
 * Expected-rejection vocabulary for server-function handlers. `meta` is the
 * redaction seam: it reaches the request log only (domain IDs and counts —
 * never names, emails, titles, or payloads) while the thrown error carries
 * just message/status/code across the wire. The fn guard logs a second,
 * boundary-level line for the same rejection; that duplication is two layers
 * reporting, not a bug. New statuses copy this five-line shape.
 */
export function throwNotFound(
  message: string,
  meta?: Record<string, unknown>,
): never {
  getRequestLogger().warn({ reason: message, ...meta }, "[notFound] rejected")
  throw new HttpError(message, 404, "NOT_FOUND")
}

export function throwUnauthorized(
  message: string,
  meta?: Record<string, unknown>,
): never {
  getRequestLogger().warn(
    { reason: message, ...meta },
    "[unauthorized] rejected",
  )
  throw new HttpError(message, 401, "UNAUTHENTICATED")
}

export function throwForbidden(
  message: string,
  meta?: Record<string, unknown>,
): never {
  getRequestLogger().warn({ reason: message, ...meta }, "[forbidden] rejected")
  throw new HttpError(message, 403, "FORBIDDEN")
}
