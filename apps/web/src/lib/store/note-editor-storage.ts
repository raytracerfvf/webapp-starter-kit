import { z } from "zod"
import type { PersistStorage, StorageValue } from "zustand/middleware"

import {
  NOTE_TITLE_MAX_LENGTH,
  NoteContentSchema,
  NoteVisibilitySchema,
} from "@repo/shared"

export const NOTE_DRAFT_VERSION = 4

const DraftContentSchema = z.strictObject({
  title: z.string().max(NOTE_TITLE_MAX_LENGTH),
  content: NoteContentSchema,
  visibility: NoteVisibilitySchema,
})
export type NoteDraftContent = z.infer<typeof DraftContentSchema>

export const PersistedNoteDraftSchema = z.strictObject({
  ...DraftContentSchema.shape,
  lastSaved: DraftContentSchema,
  // updatedAt of the server note the draft was based on; 0 before it exists.
  serverUpdatedAt: z.number().int().nonnegative(),
})
export type PersistedNoteDraft = z.infer<typeof PersistedNoteDraftSchema>

export function hasUnsavedChanges(
  draft: NoteDraftContent & { lastSaved: NoteDraftContent },
) {
  return (
    draft.title !== draft.lastSaved.title ||
    draft.content.text !== draft.lastSaved.content.text ||
    draft.visibility !== draft.lastSaved.visibility
  )
}

export const unavailableDraftStorage: PersistStorage<PersistedNoteDraft> = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

const EnvelopeSchema = z.strictObject({
  state: PersistedNoteDraftSchema,
  version: z.number().int(),
})

export function draftStorage(
  storage: Storage,
): PersistStorage<PersistedNoteDraft> {
  return {
    getItem: (key) => {
      const serialized = storage.getItem(key)
      if (!serialized) return null
      try {
        const parsed = EnvelopeSchema.safeParse(JSON.parse(serialized))
        if (!parsed.success || parsed.data.version !== NOTE_DRAFT_VERSION) {
          storage.removeItem(key)
          return null
        }
        return { state: parsed.data.state, version: NOTE_DRAFT_VERSION }
      } catch {
        storage.removeItem(key)
        return null
      }
    },
    setItem: (key, value: StorageValue<PersistedNoteDraft>) => {
      if (hasUnsavedChanges(value.state)) {
        storage.setItem(key, JSON.stringify(value))
      } else {
        storage.removeItem(key)
      }
    },
    removeItem: (key) => storage.removeItem(key),
  }
}
