import "@tanstack/react-start/server-only"

import { AsyncLocalStorage } from "node:async_hooks"

import pino, { type Logger } from "pino"
import pinoPretty from "pino-pretty"

import { serverEnv } from "../env/server"

// Backstop for the logging skill's privacy rules. Exported for the regression
// test asserting the redaction/errorKey contract against real pino output.
export const loggerOptions = {
  redact: {
    paths: [
      "email",
      "*.email",
      "token",
      "*.token",
      "secret",
      "*.secret",
      "password",
      "*.password",
      "cookie",
      "*.cookie",
      "authorization",
      "*.authorization",
      "headers",
      "*.headers",
    ],
    censor: "[redacted]",
  },
  // The convention (logging skill) passes caught exceptions as `error`, but
  // pino's Error serializer only applies at its errorKey — default "err".
  // Without this, `{ error }` serializes as {} (no message, no stack).
  errorKey: "error",
}

const logger: Logger =
  serverEnv.NODE_ENV === "production"
    ? pino({
        level: serverEnv.LOG_LEVEL,
        ...loggerOptions,
        formatters: { level: (label) => ({ level: label }) },
      })
    : pino(
        { level: serverEnv.LOG_LEVEL, ...loggerOptions },
        pinoPretty({
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        }),
      )

export interface RequestContext {
  correlationId: string
  logger: Logger
  userId?: string
}

const requestContext = new AsyncLocalStorage<RequestContext>()

export function createRequestLogger(correlationId: string) {
  return logger.child({ correlationId })
}

// For logging outside any request (startup checks, boot warnings).
export const baseLogger = logger

export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => T,
): T {
  return requestContext.run(context, callback)
}

export function getRequestLogger() {
  return requestContext.getStore()?.logger ?? logger
}

// Rebinds the context logger so later log lines carry the (opaque) userId.
export function setRequestUserId(userId: string) {
  const store = requestContext.getStore()
  if (!store || store.userId === userId) return
  store.userId = userId
  store.logger = store.logger.child({ userId })
}
