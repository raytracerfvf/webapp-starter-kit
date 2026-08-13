import { CreateNoteInputSchema } from "@repo/shared"

import type { NoteDraftContent } from "./note-editor-storage"

export function validateNoteDraft(draft: NoteDraftContent) {
  return CreateNoteInputSchema.safeParse(draft)
}
