import type { DrizzleExecutor } from "../src/db/client"
import { user } from "../src/db/schema/auth.gen"
import { NOTE_SCHEMA_VERSION, notes } from "../src/db/schema/notes"
import { NoteVisibility } from "../src/domain/enums"
import { NotePublicIdSchema } from "../src/domain/public-id"

export const SEED_USER_ID = "seed-user"
export const SEED_NOTE_PUBLIC_ID = NotePublicIdSchema.parse("note_seedwelcome")

export async function ensureSeedUser(db: DrizzleExecutor) {
  const [seedUser] = await db
    .insert(user)
    .values({
      id: SEED_USER_ID,
      name: "Starter User",
      email: "starter@example.test",
      emailVerified: true,
    })
    .onConflictDoNothing({ target: user.id })
    .returning()
  return seedUser ?? null
}

export async function ensureSeedNote(db: DrizzleExecutor, ownerId: string) {
  const [note] = await db
    .insert(notes)
    .values({
      id: "seed-note",
      publicId: SEED_NOTE_PUBLIC_ID,
      ownerId,
      title: "Welcome to the starter",
      content: {
        text: "This seeded note exercises the same table as production.",
      },
      visibility: NoteVisibility.UNLISTED,
      version: NOTE_SCHEMA_VERSION,
    })
    .onConflictDoNothing({ target: notes.id })
    .returning()
  return note ?? null
}
