import { useSuspenseQuery } from "@tanstack/react-query"

import type { NotePublicId } from "@repo/shared"

import { noteDetailOptions, notesListOptions } from "@/lib/queries/notes"

export const useNotesListQuery = () => useSuspenseQuery(notesListOptions())

export const useNoteDetailQuery = (publicId: NotePublicId) =>
  useSuspenseQuery(noteDetailOptions(publicId))
