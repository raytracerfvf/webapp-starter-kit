import { createMiddleware } from "@tanstack/react-start"

import { IS_INDEXABLE } from "../seo/config"
import { withResponseHeaders } from "./response-header"

export const seoHeadersMiddleware = createMiddleware({
  type: "request",
}).server(async ({ next }) => {
  const result = await next()
  if (IS_INDEXABLE && result.response.status < 400) return result
  return withResponseHeaders(result, { "x-robots-tag": "noindex, nofollow" })
})
