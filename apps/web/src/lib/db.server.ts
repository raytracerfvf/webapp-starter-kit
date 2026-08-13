import "@tanstack/react-start/server-only"

import { createDb } from "@repo/shared/db/index"

import { serverEnv } from "./env/server"
import { baseLogger } from "./middleware/request-context.server"

export const db = createDb(serverEnv.DATABASE_URL, (error) =>
  baseLogger.error({ error }, "[db] idle client error"),
)
