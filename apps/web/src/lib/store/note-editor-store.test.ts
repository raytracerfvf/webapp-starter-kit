import { describe, expect, it, vi } from "vitest"

import { type Note, NotePublicIdSchema, NoteVisibility } from "@repo/shared"

import { hasUnsavedChanges, NOTE_DRAFT_VERSION } from "./note-editor-storage"
import {
  createNoteEditorStore,
  HISTORY_GROUP_MS,
  NEW_NOTE_DRAFT_KEY,
  noteDraftKey,
} from "./note-editor-store"
import { memoryStorage } from "./test-storage"

const note: Note = {
  publicId: NotePublicIdSchema.parse("note_abc"),
  ownerId: "user-one",
  title: "Initial",
  content: { text: "Body" },
  visibility: NoteVisibility.PRIVATE,
  updatedAt: new Date(1),
}

const saved = { note, userId: "user-one" }

function contentOf(store: ReturnType<typeof createNoteEditorStore>) {
  const state = store.getState()
  return {
    title: state.title,
    content: state.content,
    visibility: state.visibility,
  }
}

describe("note editor store — saved notes", () => {
  it("isolates stores and tracks only content edits in history", () => {
    const first = createNoteEditorStore(saved)
    const second = createNoteEditorStore(saved)
    first.getState().setTitle("Changed")
    first.getState().markSaved(contentOf(first), 5)
    expect(second.getState().title).toBe("Initial")
    expect(first.temporal.getState().pastStates).toHaveLength(1)
    first.temporal.getState().undo()
    expect(first.getState().title).toBe("Initial")
    expect(first.getState().serverUpdatedAt).toBe(5)
  })

  it("groups a typing burst into one undo entry", () => {
    vi.useFakeTimers()
    try {
      const store = createNoteEditorStore(saved)
      store.getState().setText("B")
      store.getState().setText("Bo")
      store.getState().setText("Bod")
      expect(store.temporal.getState().pastStates).toHaveLength(1)
      vi.advanceTimersByTime(HISTORY_GROUP_MS + 1)
      store.getState().setText("After the pause")
      expect(store.temporal.getState().pastStates).toHaveLength(2)
      store.temporal.getState().undo()
      expect(store.getState().content.text).toBe("Bod")
      store.temporal.getState().undo()
      expect(store.getState().content.text).toBe("Body")
    } finally {
      vi.useRealTimers()
    }
  })

  it("scopes storage keys by user and resource", () => {
    const first = NotePublicIdSchema.parse("note_first")
    const second = NotePublicIdSchema.parse("note_second")
    expect(noteDraftKey("u1", first)).not.toBe(noteDraftKey("u2", first))
    expect(noteDraftKey("u1", first)).not.toBe(noteDraftKey("u1", second))
    // The pre-auth draft is shared, so it must not collide with either.
    expect(NEW_NOTE_DRAFT_KEY).not.toBe(noteDraftKey("u1", first))
  })

  it("derives dirtiness from content, so undo/redo flips it correctly", () => {
    const store = createNoteEditorStore(saved)
    store.getState().setTitle("Changed")
    store.getState().markSaved(contentOf(store), note.updatedAt.getTime())
    expect(hasUnsavedChanges(store.getState())).toBe(false)
    store.temporal.getState().undo()
    expect(store.getState().title).toBe("Initial")
    expect(hasUnsavedChanges(store.getState())).toBe(true)
    store.temporal.getState().redo()
    expect(store.getState().title).toBe("Changed")
    expect(hasUnsavedChanges(store.getState())).toBe(false)
  })

  it("keeps edits made during a save dirty", () => {
    const store = createNoteEditorStore(saved)
    store.getState().setTitle("First edit")
    const savedContent = contentOf(store)
    store.getState().setText("A newer edit")
    store.getState().markSaved(savedContent, 20)
    expect(store.getState().lastSaved).toEqual(savedContent)
    expect(store.getState().serverUpdatedAt).toBe(20)
    expect(hasUnsavedChanges(store.getState())).toBe(true)
  })

  it("discards a rehydrated draft based on older server content", async () => {
    const raw = memoryStorage()
    raw.setItem(
      noteDraftKey("user-one", note.publicId),
      JSON.stringify({
        version: NOTE_DRAFT_VERSION,
        state: {
          title: "Stale draft",
          content: { text: "written before the note changed elsewhere" },
          visibility: "private",
          lastSaved: {
            title: "Old",
            content: { text: "Old body" },
            visibility: "private",
          },
          serverUpdatedAt: 0,
        },
      }),
    )
    const store = createNoteEditorStore(saved, raw)
    await store.persist.rehydrate()
    expect(store.getState().title).toBe("Initial")
  })

  it("applies a rehydrated draft based on the same server content", async () => {
    const raw = memoryStorage()
    raw.setItem(
      noteDraftKey("user-one", note.publicId),
      JSON.stringify({
        version: NOTE_DRAFT_VERSION,
        state: {
          title: "Fresh draft",
          content: { text: "unsaved local work" },
          visibility: "private",
          lastSaved: {
            title: "Initial",
            content: { text: "Body" },
            visibility: "private",
          },
          serverUpdatedAt: note.updatedAt.getTime(),
        },
      }),
    )
    const store = createNoteEditorStore(saved, raw)
    await store.persist.rehydrate()
    expect(store.getState().title).toBe("Fresh draft")
  })
})

describe("note editor store — notes that do not exist yet", () => {
  it("starts blank, with no identity and a blank clean checkpoint", () => {
    const store = createNoteEditorStore(null)
    expect(store.getState().identity).toBeNull()
    expect(store.getState().title).toBe("")
    expect(store.getState().serverUpdatedAt).toBe(0)
    // The same dirty check as a saved note: content differing from lastSaved.
    expect(hasUnsavedChanges(store.getState())).toBe(false)
    store.getState().setTitle("Guest thought")
    expect(hasUnsavedChanges(store.getState())).toBe(true)
  })

  it("treats a visibility change alone as draft content", () => {
    const store = createNoteEditorStore(null)
    store.getState().setVisibility(NoteVisibility.UNLISTED)
    expect(hasUnsavedChanges(store.getState())).toBe(true)
  })

  it("persists under the shared key and clears when undone back to blank", () => {
    const raw = memoryStorage()
    const store = createNoteEditorStore(null, raw)
    store.getState().setTitle("Guest thought")
    expect(raw.getItem(NEW_NOTE_DRAFT_KEY)).not.toBeNull()
    store.temporal.getState().undo()
    expect(store.getState().title).toBe("")
    expect(raw.getItem(NEW_NOTE_DRAFT_KEY)).toBeNull()
  })

  // The guest route is client-only, so the draft must already be in the store
  // when it is created — never a frame later.
  it("hydrates a guest draft synchronously, without rehydrate()", () => {
    const raw = memoryStorage()
    raw.setItem(
      NEW_NOTE_DRAFT_KEY,
      JSON.stringify({
        version: NOTE_DRAFT_VERSION,
        state: {
          title: "From the last visit",
          content: { text: "written before signing in" },
          visibility: "unlisted",
          lastSaved: {
            title: "",
            content: { text: "" },
            visibility: "private",
          },
          serverUpdatedAt: 0,
        },
      }),
    )
    const store = createNoteEditorStore(null, raw)
    expect(store.getState().title).toBe("From the last visit")
    expect(store.getState().visibility).toBe(NoteVisibility.UNLISTED)
    expect(hasUnsavedChanges(store.getState())).toBe(true)
    // Hydration is not an edit: undo must not lead back to a blank note.
    expect(store.temporal.getState().pastStates).toHaveLength(0)
  })

  it("discards corrupt and future-version guest drafts", () => {
    const raw = memoryStorage()
    raw.setItem(NEW_NOTE_DRAFT_KEY, "not-json")
    const corrupt = createNoteEditorStore(null, raw)
    expect(corrupt.getState().title).toBe("")
    expect(raw.getItem(NEW_NOTE_DRAFT_KEY)).toBeNull()

    raw.setItem(
      NEW_NOTE_DRAFT_KEY,
      JSON.stringify({
        version: NOTE_DRAFT_VERSION + 1,
        state: {
          title: "Future",
          content: { text: "" },
          visibility: "private",
          lastSaved: {
            title: "",
            content: { text: "" },
            visibility: "private",
          },
          serverUpdatedAt: 0,
        },
      }),
    )
    const future = createNoteEditorStore(null, raw)
    expect(future.getState().title).toBe("")
    expect(raw.getItem(NEW_NOTE_DRAFT_KEY)).toBeNull()
  })
})
