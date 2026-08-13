import { execFileSync } from "node:child_process"

import pg from "pg"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
await client.query("DROP SCHEMA IF EXISTS public CASCADE")
await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE")
await client.query("CREATE SCHEMA public")
await client.end()

if (process.argv.includes("--migrate") || process.argv.includes("-m")) {
  execFileSync("pnpm", ["db:migrate"], { stdio: "inherit" })
}
