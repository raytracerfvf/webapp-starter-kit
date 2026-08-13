import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useNoteDirty, useNoteEditorApi } from "@/contexts/note-editor-context"
import { m } from "@/i18n"
import {
  useDeleteNoteMutation,
  useNoteAutosave,
} from "@/lib/hooks/use-note-mutations"

import { NoteEditorFields } from "./note-editor-fields"

function statusMessage(status: {
  deleteFailed: boolean
  hasError: boolean
  isSaving: boolean
  dirty: boolean
}) {
  if (status.deleteFailed) return m.note_delete_error()
  if (status.hasError) return m.note_save_error()
  if (status.isSaving) return m.note_saving()
  if (status.dirty) return m.note_unsaved()
  return m.note_saved()
}

export function NoteEditor({ onDeleted }: { onDeleted: () => void }) {
  const { isSaving, hasError } = useNoteAutosave()
  const store = useNoteEditorApi()
  const dirty = useNoteDirty()
  const deleteNote = useDeleteNoteMutation()
  const handleDelete = async () => {
    if (!window.confirm(m.note_delete_confirm())) return
    const { identity } = store.getState()
    if (!identity) return
    try {
      await deleteNote.mutateAsync(identity.publicId)
    } catch {
      // Surfaced via deleteNote.isError in the status line; MutationCache
      // already logs the failure and handles 401 recovery.
      return
    }
    store.persist.clearStorage()
    onDeleted()
  }
  return (
    <NoteEditorFields
      status={statusMessage({
        deleteFailed: deleteNote.isError,
        hasError,
        isSaving,
        dirty,
      })}
      toolbar={
        <Button
          variant="ghost"
          size="sm"
          disabled={deleteNote.isPending}
          aria-label={m.note_delete_action()}
          onClick={handleDelete}
        >
          <Trash2 size={17} />
        </Button>
      }
    />
  )
}
