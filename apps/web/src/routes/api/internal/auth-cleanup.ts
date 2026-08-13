import { createHash, timingSafeEqual } from "node:crypto"

import { createFileRoute } from "@tanstack/react-router"

import { deleteExpiredAuthRecords } from "@repo/shared"

import { db } from "@/lib/db.server"
import { serverEnv } from "@/lib/env/server"
import { getRequestLogger } from "@/lib/middleware/request-context.server"

// Hashing first gives fixed-length inputs, so no length-based early exit.
function matchesSecret(provided: string | null, expected: string) {
  if (!provided) return false
  const digest = (value: string) => createHash("sha256").update(value).digest()
  return timingSafeEqual(digest(provided), digest(expected))
}

export const Route = createFileRoute("/api/internal/auth-cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (
          !serverEnv.AUTH_CLEANUP_SECRET ||
          !matchesSecret(
            request.headers.get("x-cleanup-secret"),
            serverEnv.AUTH_CLEANUP_SECRET,
          )
        ) {
          // Rejections must be visible in logs (brute-force attempts against
          // the secret); never log the provided header value.
          getRequestLogger().warn(
            { reason: "invalid cleanup secret" },
            "[auth-cleanup] rejected",
          )
          return new Response(null, { status: 401 })
        }
        const removed = await deleteExpiredAuthRecords(db)
        return Response.json({ ok: true, removed })
      },
    },
  },
})
