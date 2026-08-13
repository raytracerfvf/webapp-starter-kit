import { fileURLToPath } from "node:url"

import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"

import { user } from "./schema/auth.gen"
import * as schema from "./schema/index"

const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
)

// Test-only (PGlite is a devDependency). The suite runs with isolate: false;
// call this per test file instead of sharing an instance.
export async function createTestDb() {
  const client = new PGlite()
  const db = drizzle(client, { schema, casing: "snake_case" })
  await migrate(db, { migrationsFolder })
  return db
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>

export async function createTestUser(db: TestDb, id: string) {
  await db.insert(user).values({
    id,
    name: `User ${id}`,
    email: `${id}@example.test`,
  })
  return id
}
