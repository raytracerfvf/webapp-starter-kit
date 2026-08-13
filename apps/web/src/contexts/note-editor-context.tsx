import { createSelectorHooks } from "auto-zustand-selectors-hook"
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react"
import { useStore } from "zustand"

import type { Note } from "@repo/shared"

import {
  createNoteEditorStore,
  type NoteEditorStore,
} from "@/lib/store/note-editor-store"
import * as selectors from "@/lib/store/note-editor-store-selectors"

type SavedNote = { note: Note; userId: string } | null

function createNoteEditorStoreWithSelectors(
  saved: SavedNote,
  storage?: Storage,
) {
  const store = createNoteEditorStore(saved, storage)
  const storeWithSelectors = createSelectorHooks(store)
  // The generator mutates and returns the vanilla store. Object.assign keeps
  // the middleware-enhanced API in the inferred type without a type assertion.
  return Object.assign(store, storeWithSelectors)
}

type NoteEditorStoreWithSelectors = ReturnType<
  typeof createNoteEditorStoreWithSelectors
>

const NoteEditorContext = createContext<NoteEditorStoreWithSelectors | null>(
  null,
)

export function NoteEditorProvider({
  saved = null,
  children,
}: {
  saved?: SavedNote
  children: ReactNode
}) {
  const [store] = useState(() =>
    createNoteEditorStoreWithSelectors(
      saved,
      typeof window === "undefined" ? undefined : window.localStorage,
    ),
  )
  // A guest draft hydrated synchronously at creation; only a server-rendered
  // note still has storage to read. Captured once so a fresh `saved` object
  // each render cannot re-trigger the effect.
  const [rehydrates] = useState(saved !== null)
  useEffect(() => {
    if (!rehydrates) return
    store.temporal.getState().pause()
    // rehydrate() is not guaranteed to return a promise.
    void Promise.resolve(store.persist.rehydrate()).finally(() =>
      store.temporal.getState().resume(),
    )
  }, [store, rehydrates])
  // Deliberate snapshot ownership: later note prop updates never reach the
  // store; identity changes remount via the route key (see state-management).
  return (
    <NoteEditorContext.Provider value={store}>
      {children}
    </NoteEditorContext.Provider>
  )
}

export function useNoteEditorStore() {
  const store = useContext(NoteEditorContext)
  if (!store)
    throw new Error("useNoteEditorStore must be used within NoteEditorProvider")
  return store
}

export const useNoteTitle = () => useNoteEditorStore().useTitle()
export const useNoteContent = () => useNoteEditorStore().useContent()
export const useNoteVisibility = () => useNoteEditorStore().useVisibility()

export const useSetNoteTitle = () => useNoteEditorStore().useSetTitle()
export const useSetNoteText = () => useNoteEditorStore().useSetText()
export const useSetNoteVisibility = () =>
  useNoteEditorStore().useSetVisibility()

export const useNoteDirty = () => selectors.useDirty(useNoteEditorStore())

export const useNoteEditorApi = (): NoteEditorStore => useNoteEditorStore()

export const useCanUndo = () => {
  const store = useNoteEditorApi()
  return useStore(store.temporal, (state) => state.pastStates.length > 0)
}

export const useCanRedo = () => {
  const store = useNoteEditorApi()
  return useStore(store.temporal, (state) => state.futureStates.length > 0)
}

export function useNoteUndo() {
  const store = useNoteEditorApi()
  return () => store.temporal.getState().undo()
}

export function useNoteRedo() {
  const store = useNoteEditorApi()
  return () => store.temporal.getState().redo()
}
