import { createMiddleware } from "@tanstack/react-start"

import { sanitizeBoundaryError } from "./sanitize-error.server"

export const fnGuardMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    try {
      return await next()
    } catch (error) {
      sanitizeBoundaryError(error, "serverFn")
    }
  },
)
