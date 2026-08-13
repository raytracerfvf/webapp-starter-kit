import { createMiddleware } from "@tanstack/react-start"

import { serverEnv } from "../env/server"
import { withResponseHeaders } from "./response-header"

const securityHeaders: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  ...(serverEnv.NODE_ENV === "production"
    ? { "strict-transport-security": "max-age=31536000" }
    : {}),
}

export const securityHeadersMiddleware = createMiddleware({
  type: "request",
}).server(async ({ next }) =>
  withResponseHeaders(await next(), securityHeaders),
)
