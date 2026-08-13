import { isNotFound, isRedirect } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"

import {
  createRequestLogger,
  getRequestLogger,
  runWithRequestContext,
} from "./request-context.server"
import { withResponseHeaders } from "./response-header"

function traceId(traceparent: string | null) {
  const match = traceparent?.match(
    /^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i,
  )
  return match?.[1]
}

// Client-supplied IDs are stamped onto every log line; bound them.
function suppliedId(headers: Headers) {
  const supplied =
    headers.get("x-request-id") ?? headers.get("x-correlation-id")
  return supplied && /^[\w-]{1,64}$/.test(supplied) ? supplied : undefined
}

// Web Crypto, not node:crypto: a Node import outside .server() reaches the
// client bundle and crashes hydration.
export function resolveCorrelationId(headers: Headers) {
  return (
    traceId(headers.get("traceparent")) ??
    suppliedId(headers) ??
    crypto.randomUUID()
  )
}

export const loggingMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next, request }) => {
    const startedAt = performance.now()
    const correlationId = resolveCorrelationId(request.headers)
    const requestLogger = createRequestLogger(correlationId)
    const url = new URL(request.url)

    return runWithRequestContext(
      { correlationId, logger: requestLogger },
      async () => {
        requestLogger.info(
          { method: request.method, url: url.pathname },
          "[request] started",
        )
        try {
          const result = await next()
          // Context logger, not the captured one: auth may have rebound it with userId.
          getRequestLogger().info(
            {
              duration: Math.round(performance.now() - startedAt),
              statusCode: result.response.status,
            },
            "[request] completed",
          )
          return withResponseHeaders(result, {
            "x-correlation-id": correlationId,
          })
        } catch (error) {
          // Duration only — the error sanitizer owns error logging.
          if (!isRedirect(error) && !isNotFound(error)) {
            getRequestLogger().info(
              { duration: Math.round(performance.now() - startedAt) },
              "[request] failed",
            )
          }
          throw error
        }
      },
    )
  },
)
