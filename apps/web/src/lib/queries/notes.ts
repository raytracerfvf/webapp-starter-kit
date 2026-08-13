import { type QueryClient, queryOptions } from "@tanstack/react-query"

import type {
  AccessLevel,
  CreateNoteInput,
  Note,
  NotePublicId,
  UpdateNoteInput,
} from "@repo/shared"

import {
  createNoteFn,
  deleteNoteFn,
  getNoteByPublicIdFn,
  listNotesFn,
  updateNoteFn,
} from "@/server/notes"

export type OwnedNote = Note & { access: typeof AccessLevel.OWNER }

export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
  details: () => [...noteKeys.all, "detail"] as const,
  detail: (publicId: NotePublicId) =>
    [...noteKeys.details(), publicId] as const,
}

export function notesListOptions() {
  return queryOptions({
    queryKey: noteKeys.lists(),
    queryFn: () => listNotesFn(),
  })
}

export function noteDetailOptions(publicId: NotePublicId) {
  return queryOptions({
    queryKey: noteKeys.detail(publicId),
    queryFn: () => getNoteByPublicIdFn({ data: { publicId } }),
  })
}

// Single cache-consistency path for every note write, autosave included. The
// tagged queryKey types the setQueryData payload against the detail query.
export function applyNoteWrite(queryClient: QueryClient, note: OwnedNote) {
  queryClient.setQueryData(noteDetailOptions(note.publicId).queryKey, note)
  return queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
}

export function createNote(input: CreateNoteInput) {
  return createNoteFn({ data: input })
}

export function updateNote(input: UpdateNoteInput) {
  return updateNoteFn({ data: input })
}

export function deleteNote(publicId: NotePublicId) {
  return deleteNoteFn({ data: { publicId } })
}
