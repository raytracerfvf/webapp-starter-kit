import { z } from "zod"

export const LOCAL_ORIGIN = "http://localhost:3000"

export const HttpOriginSchema = z
  .url({ protocol: /^https?$/ })
  .refine((value) => {
    const url = new URL(value)
    return (
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    )
  }, "must be an origin without credentials, path, query, or fragment")
  .transform((value) => new URL(value).origin)
