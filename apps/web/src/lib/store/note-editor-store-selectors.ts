import { useStore } from "zustand"

import { hasUnsavedChanges } from "./note-editor-storage"
import type { NoteEditorStore } from "./note-editor-store"

export const useDirty = (store: NoteEditorStore) =>
  useStore(store, hasUnsavedChanges)
