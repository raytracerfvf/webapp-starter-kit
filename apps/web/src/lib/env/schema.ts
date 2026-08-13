import { z } from "zod"

import { HttpOriginSchema, LOCAL_ORIGIN } from "./origin"

export const PostgresUrlSchema = z
  .url({ protocol: /^postgres(ql)?$/ })
  .refine((value) => {
    const url = new URL(value)
    return Boolean(url.pathname && url.pathname !== "/") && !url.hash
  }, "must be a PostgreSQL URL with a database name and no fragment")

const nonBlankString = z
  .string()
  .min(1)
  .refine((value) => value === value.trim(), {
    message: "must not start or end with whitespace",
  })

// Mirrors LOCAL_SIGNING_SECRET in the Python service; both sides refuse it in production.
const LOCAL_PYTHON_SERVICE_SIGNING_SECRET =
  "local-python-service-secret-change-me-now"

export const serverEnvShape = {
  DATABASE_URL: PostgresUrlSchema,
  BETTER_AUTH_SECRET: nonBlankString.min(32),
  BETTER_AUTH_URL: HttpOriginSchema.optional(),
  EMAIL_MODE: z.enum(["log", "resend", "disabled"]).default("log"),
  RESEND_API_KEY: nonBlankString.optional(),
  GOOGLE_CLIENT_ID: nonBlankString.optional(),
  GOOGLE_CLIENT_SECRET: nonBlankString.optional(),
  GITHUB_CLIENT_ID: nonBlankString.optional(),
  GITHUB_CLIENT_SECRET: nonBlankString.optional(),
  AUTH_CLEANUP_SECRET: nonBlankString.min(32).optional(),
  PYTHON_SERVICE_URL: HttpOriginSchema.optional(),
  PYTHON_SERVICE_SIGNING_SECRET: nonBlankString
    .min(32)
    .default(LOCAL_PYTHON_SERVICE_SIGNING_SECRET),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
}

type RawServerEnvironment = z.infer<z.ZodObject<typeof serverEnvShape>>

function requirePair(
  environment: RawServerEnvironment,
  context: z.RefinementCtx,
  provider: "GOOGLE" | "GITHUB",
) {
  const clientId = environment[`${provider}_CLIENT_ID`]
  const clientSecret = environment[`${provider}_CLIENT_SECRET`]
  if (Boolean(clientId) === Boolean(clientSecret)) return
  context.addIssue({
    code: "custom",
    path: [`${provider}_CLIENT_SECRET`],
    message: `${provider} credentials must be configured together`,
  })
}

export const ServerEnvSchema = z
  .object(serverEnvShape)
  .superRefine((environment, context) => {
    requirePair(environment, context, "GOOGLE")
    requirePair(environment, context, "GITHUB")
    if (environment.EMAIL_MODE === "resend" && !environment.RESEND_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "is required when EMAIL_MODE=resend",
      })
    }
    if (environment.NODE_ENV === "production" && !environment.BETTER_AUTH_URL) {
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message: "is required when NODE_ENV=production",
      })
    }
    if (
      environment.NODE_ENV === "production" &&
      environment.PYTHON_SERVICE_URL &&
      environment.PYTHON_SERVICE_SIGNING_SECRET ===
        LOCAL_PYTHON_SERVICE_SIGNING_SECRET
    ) {
      context.addIssue({
        code: "custom",
        path: ["PYTHON_SERVICE_SIGNING_SECRET"],
        message:
          "must be overridden in production when PYTHON_SERVICE_URL is set",
      })
    }
  })
  .transform((environment) => ({
    ...environment,
    BETTER_AUTH_URL: environment.BETTER_AUTH_URL ?? LOCAL_ORIGIN,
  }))
