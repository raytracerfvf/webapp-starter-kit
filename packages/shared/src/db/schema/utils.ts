import { createId } from "@paralleldrive/cuid2"
import { sql } from "drizzle-orm"
import { check, integer, type PgColumn, text } from "drizzle-orm/pg-core"

import { createNotePublicId, type NotePublicId } from "../../domain/public-id"

export const cuid = (name: string) => text(name).$defaultFn(() => createId())

export const notePublicId = (name: string) =>
  text(name).$type<NotePublicId>().$defaultFn(createNotePublicId)

// The schema version the row's JSONB was written under. No database default, so
// the insert type forces every write to state one.
export const rowVersion = (name: string) => integer(name).notNull()

export const rowVersionCheck = (name: string, column: PgColumn) =>
  check(name, sql`${column} > 0`)
