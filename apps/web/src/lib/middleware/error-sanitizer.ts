import { createMiddleware } from "@tanstack/react-start"

import { sanitizeBoundaryError } from "./sanitize-error.server"

export const errorSanitizerMiddleware = createMiddleware({
  type: "request",
}).server(async ({ next }) => {
  try {
    return await next()
  } catch (error) {
    sanitizeBoundaryError(error, "request")
  }
})
