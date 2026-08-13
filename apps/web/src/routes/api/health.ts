import { createFileRoute } from "@tanstack/react-router"

import { pingDatabase } from "@repo/shared/db/index"

import { db } from "@/lib/db.server"
import { getRequestLogger } from "@/lib/middleware/request-context.server"

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        let databaseOk = true
        try {
          await pingDatabase(db)
        } catch (error) {
          databaseOk = false
          getRequestLogger().error({ error }, "[health.database] failed")
        }
        return Response.json(
          {
            status: databaseOk ? "ok" : "degraded",
            database: databaseOk ? "ok" : "error",
            version: __APP_VERSION__,
            timestamp: new Date().toISOString(),
          },
          { status: databaseOk ? 200 : 503 },
        )
      },
    },
  },
})
