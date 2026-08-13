import { z } from "zod"

export const NOTE_VISIBILITIES = ["private", "unlisted"] as const
export const NoteVisibility = {
  PRIVATE: "private",
  UNLISTED: "unlisted",
} as const satisfies Record<string, (typeof NOTE_VISIBILITIES)[number]>
export const NoteVisibilitySchema = z.enum(NOTE_VISIBILITIES)
export type NoteVisibility = z.infer<typeof NoteVisibilitySchema>
