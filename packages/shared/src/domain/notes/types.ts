import { z } from "zod"

import {
  NOTE_TEXT_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  NoteContentSchema,
} from "../../db/schema/notes"
import { NoteVisibilitySchema } from "../enums"
import { NotePublicIdSchema } from "../public-id"

export type { NoteContent } from "../../db/schema/notes"
export { NOTE_TEXT_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH, NoteContentSchema }

export const CreateNoteInputSchema = z.object({
  title: z.string().trim().min(1).max(NOTE_TITLE_MAX_LENGTH),
  content: NoteContentSchema,
  visibility: NoteVisibilitySchema,
})
export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>

export const UpdateNoteInputSchema = CreateNoteInputSchema.extend({
  publicId: NotePublicIdSchema,
})
export type UpdateNoteInput = z.infer<typeof UpdateNoteInputSchema>

export const NotePublicIdInputSchema = z.object({
  publicId: NotePublicIdSchema,
})
