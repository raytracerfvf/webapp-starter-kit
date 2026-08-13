import { act, cleanup, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { type Note, NotePublicIdSchema, NoteVisibility } from "@repo/shared"

import { NOTE_DRAFT_VERSION } from "@/lib/store/note-editor-storage"
import { NEW_NOTE_DRAFT_KEY } from "@/lib/store/note-editor-store"

import {
  NoteEditorProvider,
  useNoteDirty,
  useNoteEditorApi,
  useNoteTitle,
  useSetNoteTitle,
} from "./note-editor-context"

function makeNote(updatedAt: Date, title: string): Note {
  return {
    publicId: NotePublicIdSchema.parse("note_providertest"),
    ownerId: "user-a",
    title,
    content: { text: "Server text" },
    visibility: NoteVisibility.PRIVATE,
    updatedAt,
  }
}

function renderEditor(initial: Note) {
  const current = { note: initial }
  const view = renderHook(() => useNoteEditorApi(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NoteEditorProvider saved={{ note: current.note, userId: "user-a" }}>
        {children}
      </NoteEditorProvider>
    ),
  })
  return {
    store: view.result.current,
    refreshFromServer: (note: Note) => {
      current.note = note
      view.rerender()
    },
  }
}

function renderNewNoteEditor() {
  const view = renderHook(() => useNoteEditorApi(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NoteEditorProvider>{children}</NoteEditorProvider>
    ),
  })
  return { store: view.result.current, rerender: () => view.rerender() }
}

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe("NoteEditorProvider snapshot ownership", () => {
  const initial = makeNote(new Date("2026-02-01T00:00:00Z"), "Server title")
  const newer = makeNote(new Date("2026-02-02T00:00:00Z"), "Refreshed title")

  it("initializes the store from the note it mounted with", () => {
    const editor = renderEditor(initial)
    expect(editor.store.getState().title).toBe("Server title")
  })

  it("ignores later note prop updates — the editor owns the snapshot until remount", () => {
    const editor = renderEditor(initial)
    act(() => editor.refreshFromServer(newer))
    expect(editor.store.getState().title).toBe("Server title")
  })

  it("keeps an active draft across re-renders", () => {
    const editor = renderEditor(initial)
    act(() => editor.store.getState().setTitle("My unsaved draft"))
    act(() => editor.refreshFromServer(newer))
    expect(editor.store.getState().title).toBe("My unsaved draft")
  })
})

describe("NoteEditorProvider without a saved note", () => {
  it("starts blank and identity-less when no guest draft exists", () => {
    const editor = renderNewNoteEditor()
    expect(editor.store.getState().title).toBe("")
    expect(editor.store.getState().identity).toBeNull()
  })

  it("has the guest draft on the very first render", () => {
    window.localStorage.setItem(
      NEW_NOTE_DRAFT_KEY,
      JSON.stringify({
        version: NOTE_DRAFT_VERSION,
        state: {
          title: "Started before sign-in",
          content: { text: "guest text" },
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
    const editor = renderNewNoteEditor()
    expect(editor.store.getState().title).toBe("Started before sign-in")
    expect(editor.store.temporal.getState().pastStates).toHaveLength(0)
  })

  it("keeps an active draft across re-renders", () => {
    const editor = renderNewNoteEditor()
    act(() => editor.store.getState().setTitle("My unsaved draft"))
    act(() => editor.rerender())
    expect(editor.store.getState().title).toBe("My unsaved draft")
  })
})

describe("NoteEditorProvider selectors", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NoteEditorProvider>{children}</NoteEditorProvider>
  )

  it("subscribes generated atomic hooks only to their selected field", () => {
    let renders = 0
    const view = renderHook(
      () => {
        renders += 1
        return {
          store: useNoteEditorApi(),
          title: useNoteTitle(),
          setTitle: useSetNoteTitle(),
        }
      },
      { wrapper },
    )

    expect(renders).toBe(1)
    act(() => view.result.current.store.getState().setText("Body only"))
    expect(renders).toBe(1)

    act(() => view.result.current.setTitle("Selected title"))
    expect(view.result.current.title).toBe("Selected title")
    expect(renders).toBe(2)
  })

  it("binds custom derived selectors to the provider store", () => {
    let renders = 0
    const view = renderHook(
      () => {
        renders += 1
        return {
          store: useNoteEditorApi(),
          dirty: useNoteDirty(),
        }
      },
      { wrapper },
    )

    expect(view.result.current.dirty).toBe(false)
    expect(renders).toBe(1)
    act(() =>
      view.result.current.store.getState().markSaved(
        {
          title: "",
          content: { text: "" },
          visibility: NoteVisibility.PRIVATE,
        },
        1,
      ),
    )
    expect(renders).toBe(1)

    act(() => view.result.current.store.getState().setTitle("Valid title"))
    expect(view.result.current.dirty).toBe(true)
    expect(renders).toBe(2)
  })

  it("isolates generated selectors between provider instances", () => {
    const first = renderHook(
      () => ({ store: useNoteEditorApi(), title: useNoteTitle() }),
      { wrapper },
    )
    const second = renderHook(
      () => ({ store: useNoteEditorApi(), title: useNoteTitle() }),
      { wrapper },
    )

    act(() => first.result.current.store.getState().setTitle("First draft"))
    expect(first.result.current.title).toBe("First draft")
    expect(second.result.current.title).toBe("")
  })

  it("rejects selector use without its provider", () => {
    expect(() => renderHook(() => useNoteTitle())).toThrow(
      "useNoteEditorStore must be used within NoteEditorProvider",
    )
  })
})
