import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { shallow } from "zustand/shallow"

import type { NotePublicId } from "@repo/shared"

import { useNoteEditorApi } from "@/contexts/note-editor-context"
import {
  applyNoteWrite,
  createNote,
  deleteNote,
  noteKeys,
  updateNote,
} from "@/lib/queries/notes"
import { hasUnsavedChanges } from "@/lib/store/note-editor-storage"
import { NEW_NOTE_DRAFT_KEY } from "@/lib/store/note-editor-store"
import { validateNoteDraft } from "@/lib/store/note-editor-validation"

export function useCreateNoteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createNote,
    onSuccess: (note) => applyNoteWrite(queryClient, note),
  })
}

export function useDeleteNoteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteNote,
    // Remove, never invalidate, the detail entry: invalidating refetches the
    // still-mounted detail query for the deleted note, a guaranteed 404.
    onSuccess: (_note, publicId) => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(publicId) })
      return queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

// Owns the note-update mutation: autosave is its only writer. Query's scope
// serializes overlapping saves, and MutationCache.onError (401 recovery) sees
// failures because this runs as a mutation.
export function useNoteAutosave(delay = 700) {
  const store = useNoteEditorApi()
  const queryClient = useQueryClient()
  // flush() below is a no-op without identity, so the fallback never serializes.
  const identity = store.getState().identity
  const save = useMutation({
    scope: { id: identity?.publicId ?? NEW_NOTE_DRAFT_KEY },
    mutationFn: updateNote,
    onSuccess: (note, input) => {
      store.getState().markSaved(
        {
          title: input.title,
          content: input.content,
          visibility: input.visibility,
        },
        note.updatedAt.getTime(),
      )
      return applyNoteWrite(queryClient, note)
    },
  })
  const { mutate } = save
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const flush = () => {
      timer = undefined
      const state = store.getState()
      if (!state.identity || !hasUnsavedChanges(state)) return
      const draft = {
        title: state.title,
        content: state.content,
        visibility: state.visibility,
      }
      if (!validateNoteDraft(draft).success) return
      mutate({
        publicId: state.identity.publicId,
        ...draft,
      })
    }
    const unsubscribe = store.subscribe(
      (state) => [state.title, state.content, state.visibility],
      () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(flush, delay)
      },
      { equalityFn: shallow },
    )
    return () => {
      unsubscribe()
      // Flush instead of drop: navigating away inside the debounce window
      // must not lose the last edits.
      if (timer) {
        clearTimeout(timer)
        flush()
      }
    }
  }, [delay, store, mutate])
  return { isSaving: save.isPending, hasError: save.isError }
}

// The click that started this save happened on a previous page load — the
// sign-in round-trip discarded it — so no handler survives to finish it and
// the intent arrives as a URL param instead. Navigation stays with the caller.
export function useResumeNoteSave({
  enabled,
  onSaved,
  onAbandoned,
}: {
  enabled: boolean
  onSaved: (publicId: NotePublicId) => void
  onAbandoned: () => void
}) {
  const store = useNoteEditorApi()
  const create = useCreateNoteMutation()
  const { mutateAsync } = create
  const attempted = useRef(false)
  useEffect(() => {
    // Latched before the attempt, and re-armed only once the caller turns the
    // flow off: a failure re-renders through the mutation's error state, which
    // would otherwise re-enter this effect and retry forever.
    if (!enabled) {
      attempted.current = false
      return
    }
    if (attempted.current) return
    attempted.current = true
    const state = store.getState()
    const validation = validateNoteDraft({
      title: state.title,
      content: state.content,
      visibility: state.visibility,
    })
    if (!validation.success) {
      onAbandoned()
      return
    }
    let cancelled = false
    mutateAsync(validation.data).then(
      (note) => {
        if (cancelled) return
        store.persist.clearStorage()
        onSaved(note.publicId)
      },
      // A failed save keeps the draft; the caller surfaces hasError.
      () => {
        if (!cancelled) onAbandoned()
      },
    )
    return () => {
      cancelled = true
    }
  }, [enabled, store, mutateAsync, onSaved, onAbandoned])
  return { isSaving: create.isPending, hasError: create.isError }
}
