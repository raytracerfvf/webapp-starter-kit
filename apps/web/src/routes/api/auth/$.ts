import { createFileRoute } from "@tanstack/react-router"

import { auth } from "@/lib/auth/auth.server"
import { getRequestLogger } from "@/lib/middleware/request-context.server"

async function handle(request: Request) {
  const response = await auth.handler(request)
  if (!response.ok) {
    getRequestLogger().warn(
      {
        method: request.method,
        url: new URL(request.url).pathname,
        statusCode: response.status,
      },
      "[auth.route] request rejected",
    )
  }
  return response
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
})
