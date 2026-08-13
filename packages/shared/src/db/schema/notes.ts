import { isNull } from "drizzle-orm"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"
import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"

import { NoteVisibility } from "../../domain/enums"
import { NotePublicIdSchema } from "../../domain/public-id"
import { user } from "./auth.gen"
import { noteVisibilityEnum } from "./enums"
import { cuid, notePublicId, rowVersion, rowVersionCheck } from "./utils"

// Bump only when a stored row can no longer satisfy NoteContentSchema: bumping is
// what makes old rows unreadable until a backfill catches them up.
export const NOTE_SCHEMA_VERSION = 1
export const NOTE_TITLE_MAX_LENGTH = 160
export const NOTE_TEXT_MAX_LENGTH = 20_000

// Declared here rather than in domain/ because the table below needs it.
export const NoteContentSchema = z.strictObject({
  text: z.string().max(NOTE_TEXT_MAX_LENGTH),
})
export type NoteContent = z.infer<typeof NoteContentSchema>

export const notes = pgTable(
  "notes",
  {
    id: cuid("id").primaryKey(),
    publicId: notePublicId("public_id").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: NOTE_TITLE_MAX_LENGTH }).notNull(),
    // $type is a compile-time overlay that checks writes; the database
    // guarantees nothing about the shape, so reads parse it.
    content: jsonb("content").$type<NoteContent>().notNull(),
    version: rowVersion("version"),
    visibility: noteVisibilityEnum("visibility")
      .notNull()
      .default(NoteVisibility.PRIVATE),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("notes_public_id_unique").on(table.publicId),
    index("notes_owner_updated_idx")
      .on(table.ownerId, table.updatedAt.desc())
      .where(isNull(table.deletedAt)),
    rowVersionCheck("notes_version_check", table.version),
  ],
)

export const NoteRowSchema = createSelectSchema(notes, {
  // Drizzle's $type overlays writes but does not constrain runtime values.
  content: NoteContentSchema,
  publicId: NotePublicIdSchema,
})
