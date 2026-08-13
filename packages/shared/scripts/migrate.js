import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import pg from "pg"

const { Pool } = pg
const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is required")

const pool = new Pool({
  connectionString: url,
  connectionTimeoutMillis: 10_000,
})
const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "drizzle",
)

try {
  await migrate(drizzle(pool), { migrationsFolder })
  console.info("[migrate] complete")
} finally {
  await pool.end()
}
