import { z } from "zod"

// Server functions throw HttpError with own statusCode/code fields (see
// lib/middleware/fn-guard.ts). After transport the error is untrusted input;
// decode it here once instead of casting or property-sniffing at call sites.
const TransportedHttpErrorSchema = z.object({
  statusCode: z.int(),
  code: z.string().optional(),
})

export function decodeHttpError(error: unknown) {
  const result = TransportedHttpErrorSchema.safeParse(error)
  return result.success ? result.data : null
}

// Query retry policy: expected client errors (401/404/403/400) fail fast to
// their boundaries; only network failures (no decoded status) and 5xx retry.
// SSR keeps query-core's server default of zero retries — an explicit retry
// function would silently override it and stall error paths by ~7s.
export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (typeof window === "undefined") return false
  const status = decodeHttpError(error)?.statusCode
  if (status !== undefined && status < 500) return false
  return failureCount < 3
}
