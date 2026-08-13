import { throttle } from "es-toolkit/function"
import { temporal } from "zundo"
import { persist, subscribeWithSelector } from "zustand/middleware"
import { shallow } from "zustand/shallow"
import { createStore } from "zustand/vanilla"

import {
  type Note,
  type NoteContent,
  type NotePublicId,
  NoteVisibility,
} from "@repo/shared"

import {
  draftStorage,
  NOTE_DRAFT_VERSION,
  type NoteDraftContent,
  type PersistedNoteDraft,
  PersistedNoteDraftSchema,
  unavailableDraftStorage,
} from "./note-editor-storage"

// A note that does not exist server-side yet is the same store with no
// identity, a blank clean checkpoint, and serverUpdatedAt 0, so dirtiness, the
// write gate, and the merge guard all reduce to the saved-note comparisons.
export interface NoteEditorState {
  // Null until the note first exists on the server.
  identity: { publicId: NotePublicId } | null
  title: string
  content: NoteContent
  visibility: NoteVisibility
  // Dirty is derived, never stored: see hasUnsavedChanges.
  lastSaved: NoteDraftContent
  serverUpdatedAt: number
  setTitle: (title: string) => void
  setText: (text: string) => void
  setVisibility: (visibility: NoteVisibility) => void
  // Receives the content that was saved: mid-save edits stay dirty.
  markSaved: (saved: NoteDraftContent, serverUpdatedAt: number) => void
}

export function noteDraftKey(userId: string, publicId: NotePublicId) {
  return `webapp:note-editor:${userId}:${publicId}`
}

// Deliberately not user-scoped: the draft may be written before any sign-in
// exists and is adopted by the first user who signs in (see draft-ownership).
export const NEW_NOTE_DRAFT_KEY = "webapp:note-editor:new"

const BLANK_CONTENT: NoteDraftContent = {
  title: "",
  content: { text: "" },
  visibility: NoteVisibility.PRIVATE,
}

export const HISTORY_GROUP_MS = 500

export function createNoteEditorStore(
  saved: { note: Note; userId: string } | null,
  storage?: Storage,
) {
  const initial = saved
    ? {
        identity: { publicId: saved.note.publicId },
        title: saved.note.title,
        content: saved.note.content,
        visibility: saved.note.visibility,
        lastSaved: {
          title: saved.note.title,
          content: saved.note.content,
          visibility: saved.note.visibility,
        },
        serverUpdatedAt: saved.note.updatedAt.getTime(),
      }
    : {
        identity: null,
        title: BLANK_CONTENT.title,
        content: BLANK_CONTENT.content,
        visibility: BLANK_CONTENT.visibility,
        lastSaved: BLANK_CONTENT,
        serverUpdatedAt: 0,
      }
  return createStore<NoteEditorState>()(
    persist(
      temporal(
        subscribeWithSelector((set) => ({
          ...initial,
          setTitle: (title) => set({ title }),
          setText: (text) =>
            set((state) => ({ content: { ...state.content, text } })),
          setVisibility: (visibility) => set({ visibility }),
          markSaved: (saved, serverUpdatedAt) =>
            set({ lastSaved: saved, serverUpdatedAt }),
        })),
        {
          limit: 50,
          partialize: (state) => ({
            title: state.title,
            content: state.content,
            visibility: state.visibility,
          }),
          equality: shallow,
          // A typing burst becomes one undo entry instead of one per keystroke.
          handleSet: (handleSet) =>
            throttle(handleSet, HISTORY_GROUP_MS, { edges: ["leading"] }),
        },
      ),
      {
        name: saved
          ? noteDraftKey(saved.userId, saved.note.publicId)
          : NEW_NOTE_DRAFT_KEY,
        version: NOTE_DRAFT_VERSION,
        storage: storage ? draftStorage(storage) : unavailableDraftStorage,
        // The guest route is client-only, so its draft hydrates synchronously
        // here. The saved-note route is server-rendered and must rehydrate in
        // an effect instead.
        skipHydration: saved !== null,
        partialize: (state): PersistedNoteDraft => ({
          title: state.title,
          content: state.content,
          visibility: state.visibility,
          lastSaved: state.lastSaved,
          serverUpdatedAt: state.serverUpdatedAt,
        }),
        // No migrate: draftStorage.getItem already drops mismatched versions.
        merge: (persisted, current) => {
          const draft = PersistedNoteDraftSchema.safeParse(persisted)
          if (!draft.success) return current
          // Drafts based on older server content would clobber newer edits.
          if (draft.data.serverUpdatedAt < current.serverUpdatedAt)
            return current
          return { ...current, ...draft.data }
        },
      },
    ),
  )
}

export type NoteEditorStore = ReturnType<typeof createNoteEditorStore>
