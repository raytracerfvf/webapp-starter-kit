import "@tanstack/react-start/server-only"

import { createEnv } from "@t3-oss/env-core"

import { ServerEnvSchema, serverEnvShape } from "./schema"

export const serverEnv = createEnv({
  server: serverEnvShape,
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  createFinalSchema: () => ServerEnvSchema,
  onValidationError: (issues) => {
    const details = issues
      .map((issue) => `${issue.path?.map(String).join(".")}: ${issue.message}`)
      .join("; ")
    throw new Error(`Invalid server environment: ${details}`)
  },
})
