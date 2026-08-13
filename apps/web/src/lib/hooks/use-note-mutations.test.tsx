import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { type Note, NotePublicIdSchema, NoteVisibility } from "@repo/shared"

import {
  NoteEditorProvider,
  useNoteEditorApi,
} from "@/contexts/note-editor-context"
import { createNote, updateNote } from "@/lib/queries/notes"
import {
  hasUnsavedChanges,
  NOTE_DRAFT_VERSION,
} from "@/lib/store/note-editor-storage"
import { NEW_NOTE_DRAFT_KEY } from "@/lib/store/note-editor-store"

import { useNoteAutosave, useResumeNoteSave } from "./use-note-mutations"

// Full module mock: the real module imports @/server/**, which would drag
// server env validation into a client-side test.
vi.mock("@/lib/queries/notes", () => ({
  noteKeys: {
    all: ["notes"],
    lists: () => ["notes", "list"],
    details: () => ["notes", "detail"],
    detail: (publicId: string) => ["notes", "detail", publicId],
  },
  noteDetailOptions: (publicId: string) => ({
    queryKey: ["notes", "detail", publicId],
  }),
  applyNoteWrite: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}))

const note: Note = {
  publicId: NotePublicIdSchema.parse("note_autosavetest"),
  ownerId: "user-a",
  title: "Server title",
  content: { text: "Server text" },
  visibility: NoteVisibility.PRIVATE,
  updatedAt: new Date("2026-02-01T00:00:00Z"),
}

function renderAutosave() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const view = renderHook(
    () => ({ status: useNoteAutosave(20), store: useNoteEditorApi() }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <NoteEditorProvider saved={{ note, userId: "user-a" }}>
            {children}
          </NoteEditorProvider>
        </QueryClientProvider>
      ),
    },
  )
  return view
}

beforeEach(() => {
  window.localStorage.clear()
  vi.mocked(updateNote).mockReset()
  vi.mocked(createNote).mockReset()
})
afterEach(cleanup)

describe("useNoteAutosave", () => {
  it("debounces an edit into one save and marks the editor clean", async () => {
    vi.mocked(updateNote).mockResolvedValue({
      ...note,
      title: "Edited",
      updatedAt: new Date("2026-02-01T00:01:00Z"),
      access: "owner",
    })
    const view = renderAutosave()
    const store = view.result.current.store
    act(() => {
      store.getState().setTitle("Edit")
      store.getState().setTitle("Edited")
    })
    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(1))
    expect(updateNote).toHaveBeenCalledWith(
      {
        publicId: note.publicId,
        title: "Edited",
        content: { text: "Server text" },
        visibility: NoteVisibility.PRIVATE,
      },
      // Query passes the mutation function a context object as second arg.
      expect.anything(),
    )
    await waitFor(() => {
      expect(view.result.current.status.isSaving).toBe(false)
      expect(hasUnsavedChanges(store.getState())).toBe(false)
    })
  })

  it("flushes a pending save on unmount instead of dropping it", async () => {
    vi.mocked(updateNote).mockResolvedValue({
      ...note,
      title: "Last edit",
      updatedAt: new Date("2026-02-01T00:01:00Z"),
      access: "owner",
    })
    const view = renderAutosave()
    const store = view.result.current.store
    act(() => store.getState().setTitle("Last edit"))
    view.unmount()
    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(1))
    expect(updateNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Last edit" }),
      expect.anything(),
    )
  })

  it("surfaces a failed save and keeps the draft dirty", async () => {
    vi.mocked(updateNote).mockRejectedValue(new Error("network down"))
    const view = renderAutosave()
    const store = view.result.current.store
    act(() => store.getState().setTitle("Doomed edit"))
    await waitFor(() => expect(view.result.current.status.hasError).toBe(true))
    expect(view.result.current.status.isSaving).toBe(false)
    expect(hasUnsavedChanges(store.getState())).toBe(true)
    expect(store.getState().title).toBe("Doomed edit")
  })

  it("keeps an invalid draft local instead of sending it", async () => {
    vi.useFakeTimers()
    try {
      const view = renderAutosave()
      act(() => view.result.current.store.getState().setTitle(" "))
      await act(() => vi.advanceTimersByTimeAsync(21))

      expect(updateNote).not.toHaveBeenCalled()
      expect(hasUnsavedChanges(view.result.current.store.getState())).toBe(true)
      view.unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})

const createdNote = {
  ...note,
  publicId: NotePublicIdSchema.parse("note_createdguest"),
  access: "owner" as const,
}

function seedGuestDraft(title: string) {
  window.localStorage.setItem(
    NEW_NOTE_DRAFT_KEY,
    JSON.stringify({
      version: NOTE_DRAFT_VERSION,
      state: {
        title,
        content: { text: "guest text" },
        visibility: NoteVisibility.PRIVATE,
        lastSaved: {
          title: "",
          content: { text: "" },
          visibility: NoteVisibility.PRIVATE,
        },
        serverUpdatedAt: 0,
      },
    }),
  )
}

function renderResume(enabled: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const calls = { saved: [] as string[], abandoned: 0 }
  const view = renderHook(
    () => ({
      status: useResumeNoteSave({
        enabled,
        onSaved: (publicId) => calls.saved.push(publicId),
        onAbandoned: () => {
          calls.abandoned += 1
        },
      }),
      store: useNoteEditorApi(),
    }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <NoteEditorProvider>{children}</NoteEditorProvider>
        </QueryClientProvider>
      ),
    },
  )
  return { view, calls }
}

describe("useResumeNoteSave", () => {
  it("saves the rehydrated guest draft once and clears it", async () => {
    seedGuestDraft("Drafted before signing in")
    vi.mocked(createNote).mockResolvedValue(createdNote)
    const { view, calls } = renderResume(true)
    await waitFor(() => expect(calls.saved).toEqual([createdNote.publicId]))
    expect(createNote).toHaveBeenCalledTimes(1)
    expect(createNote).toHaveBeenCalledWith(
      {
        title: "Drafted before signing in",
        content: { text: "guest text" },
        visibility: NoteVisibility.PRIVATE,
      },
      expect.anything(),
    )
    expect(window.localStorage.getItem(NEW_NOTE_DRAFT_KEY)).toBeNull()
    act(() => view.rerender())
    expect(createNote).toHaveBeenCalledTimes(1)
    expect(calls.abandoned).toBe(0)
  })

  it("does nothing until enabled", () => {
    seedGuestDraft("Waiting on sign-in")
    const { calls } = renderResume(false)
    expect(createNote).not.toHaveBeenCalled()
    expect(calls.abandoned).toBe(0)
  })

  it("abandons a blank draft instead of saving an invalid note", async () => {
    const { calls } = renderResume(true)
    await waitFor(() => expect(calls.abandoned).toBe(1))
    expect(createNote).not.toHaveBeenCalled()
  })

  it("keeps the draft when the save fails", async () => {
    seedGuestDraft("Doomed guest draft")
    vi.mocked(createNote).mockRejectedValue(new Error("network down"))
    const { view, calls } = renderResume(true)
    await waitFor(() => expect(calls.abandoned).toBe(1))
    expect(view.result.current.status.hasError).toBe(true)
    expect(calls.saved).toEqual([])
    expect(view.result.current.store.getState().title).toBe(
      "Doomed guest draft",
    )
    expect(window.localStorage.getItem(NEW_NOTE_DRAFT_KEY)).not.toBeNull()
  })
})
