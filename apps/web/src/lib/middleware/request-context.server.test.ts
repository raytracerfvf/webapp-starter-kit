import pino from "pino"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

// The module validates the full server environment at import; this test only
// exercises logger configuration.
vi.mock("../env/server", () => ({
  serverEnv: { NODE_ENV: "test", LOG_LEVEL: "info" },
}))

import { loggerOptions } from "./request-context.server"

// Runs real pino against an in-memory stream: the app logger's own output
// goes to stdout, which tests cannot observe.
function logLine(write: (logger: pino.Logger) => void): unknown {
  const lines: string[] = []
  const logger = pino(loggerOptions, {
    write: (line: string) => {
      lines.push(line)
    },
  })
  write(logger)
  const [line] = lines
  if (line === undefined) throw new Error("expected a log line")
  return JSON.parse(line)
}

describe("loggerOptions", () => {
  it("serializes exceptions logged under the conventional `error` key", () => {
    const line = z
      .object({
        error: z.object({
          message: z.string(),
          type: z.string(),
          stack: z.string(),
        }),
      })
      .parse(logLine((logger) => logger.error({ error: new Error("boom") })))
    expect(line.error.message).toBe("boom")
    expect(line.error.type).toBe("Error")
  })

  it("redacts sensitive fields", () => {
    const line = z
      .object({ email: z.string() })
      .parse(logLine((logger) => logger.warn({ email: "person@example.com" })))
    expect(line.email).toBe("[redacted]")
  })
})
