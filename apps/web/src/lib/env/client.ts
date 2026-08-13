import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import { HttpOriginSchema, LOCAL_ORIGIN } from "./origin"

const siteOriginSchema = import.meta.env.PROD
  ? HttpOriginSchema
  : HttpOriginSchema.default(LOCAL_ORIGIN)

export const clientEnv = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_POSTHOG_KEY: z.string().trim().min(1).optional(),
    VITE_SEO_INDEXABLE: z.enum(["true", "false"]).default("false"),
    VITE_SITE_ORIGIN: siteOriginSchema,
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
