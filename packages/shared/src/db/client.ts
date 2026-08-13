import { type ExtractTablesWithRelations, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"
import { Pool } from "pg"

import * as schema from "./schema/index"

export function createDb(
  connectionString: string,
  onPoolError?: (error: Error) => void,
) {
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30_000,
  })
  pool.on(
    "error",
    onPoolError ?? ((error) => console.error("[db] idle client error:", error)),
  )
  return drizzle(pool, { schema, casing: "snake_case" })
}

export async function pingDatabase(db: DrizzleExecutor) {
  await db.execute(sql`select 1`)
}

export type DrizzleClient = ReturnType<typeof createDb>
// Driver-agnostic so tests can run domain operations against PGlite.
export type DrizzleExecutor = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>
