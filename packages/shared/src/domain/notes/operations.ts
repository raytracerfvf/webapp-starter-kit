import { and, desc, eq, isNull } from "drizzle-orm"

import type { DrizzleExecutor } from "../../db/client"
import {
  NOTE_SCHEMA_VERSION,
  type NoteContent,
  NoteContentSchema,
  notes,
} from "../../db/schema/notes"
import { AccessLevel, noteAccess } from "../access-control"
import type { NotePublicId } from "../public-id"
import type { CreateNoteInput, UpdateNoteInput } from "./types"

type NoteRow = typeof notes.$inferSelect

function projectNote(row: NoteRow, content: NoteContent) {
  return {
    publicId: row.publicId,
    ownerId: row.ownerId,
    title: row.title,
    content,
    visibility: row.visibility,
    updatedAt: row.updatedAt,
  }
}
export type Note = ReturnType<typeof projectNote>

function toNote(row: NoteRow): Note {
  if (row.version !== NOTE_SCHEMA_VERSION) {
    throw new Error(
      `Stored note row is at schema version ${row.version}, expected ${NOTE_SCHEMA_VERSION}`,
    )
  }
  let content: NoteContent
  try {
    content = NoteContentSchema.parse(row.content)
  } catch (error) {
    // Corrupt storage is a server fault; a bare ZodError sanitizes to 400.
    throw new Error("Failed to decode stored note row", { cause: error })
  }
  return projectNote(row, content)
}

function toOwnedNote(note: Note) {
  return { ...note, access: AccessLevel.OWNER } as const
}

function toSharedNote(note: Note) {
  return {
    access: AccessLevel.READ_ONLY,
    publicId: note.publicId,
    title: note.title,
    content: note.content,
    updatedAt: note.updatedAt,
  } as const
}

export type NoteView =
  | ReturnType<typeof toOwnedNote>
  | ReturnType<typeof toSharedNote>

const live = () => isNull(notes.deletedAt)

export async function listNotes(db: DrizzleExecutor, ownerId: string) {
  return db
    .select({
      publicId: notes.publicId,
      title: notes.title,
      visibility: notes.visibility,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.ownerId, ownerId), live()))
    .orderBy(desc(notes.updatedAt))
}
export type NoteSummary = Awaited<ReturnType<typeof listNotes>>[number]

export async function getNoteByPublicId(
  db: DrizzleExecutor,
  publicId: NotePublicId,
  viewerId: string | null,
): Promise<NoteView | null> {
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.publicId, publicId), live()))
    .limit(1)
  if (!row) return null
  const note = toNote(row)
  const access = noteAccess({
    ownerId: note.ownerId,
    viewerId,
    visibility: note.visibility,
  })
  if (access === AccessLevel.NONE) return null
  return access === AccessLevel.OWNER ? toOwnedNote(note) : toSharedNote(note)
}

export async function createNote(
  db: DrizzleExecutor,
  actorId: string,
  input: CreateNoteInput,
) {
  const [row] = await db
    .insert(notes)
    .values({
      ownerId: actorId,
      title: input.title,
      content: input.content,
      visibility: input.visibility,
      version: NOTE_SCHEMA_VERSION,
    })
    .returning()
  if (!row) throw new Error("Note insert returned no row")
  return toOwnedNote(projectNote(row, row.content))
}

export async function updateNote(
  db: DrizzleExecutor,
  actorId: string,
  input: UpdateNoteInput,
) {
  const [row] = await db
    .update(notes)
    .set({
      title: input.title,
      content: input.content,
      visibility: input.visibility,
      version: NOTE_SCHEMA_VERSION,
    })
    .where(
      and(
        eq(notes.publicId, input.publicId),
        eq(notes.ownerId, actorId),
        live(),
      ),
    )
    .returning()
  return row ? toOwnedNote(projectNote(row, row.content)) : null
}

export async function deleteNote(
  db: DrizzleExecutor,
  actorId: string,
  publicId: NotePublicId,
) {
  const [row] = await db
    .update(notes)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(notes.publicId, publicId), eq(notes.ownerId, actorId), live()),
    )
    .returning({ publicId: notes.publicId })
  return row ?? null
}
