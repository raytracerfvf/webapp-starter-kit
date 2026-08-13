import { createId } from "@paralleldrive/cuid2"
import { z } from "zod"

// Bounded: this validates raw URL params before they reach the database.
export const NotePublicIdSchema = z
  .templateLiteral(["note_", z.string().regex(/^[a-z0-9]{1,64}$/)])
  .brand<"NotePublicId">()
export type NotePublicId = z.infer<typeof NotePublicIdSchema>

export function createNotePublicId(): NotePublicId {
  return NotePublicIdSchema.parse(`note_${createId()}`)
}
