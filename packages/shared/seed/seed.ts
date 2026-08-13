import "../../../scripts/with-env.mjs"

import { createDb } from "../src/db/client"
import {
  ensureSeedNote,
  ensureSeedUser,
  SEED_NOTE_PUBLIC_ID,
  SEED_USER_ID,
} from "./fixtures"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")

const db = createDb(process.env.DATABASE_URL)
try {
  await ensureSeedUser(db)
  await ensureSeedNote(db, SEED_USER_ID)
  console.log(`Seed note: /n/${SEED_NOTE_PUBLIC_ID}`)
} finally {
  await db.$client.end()
}
