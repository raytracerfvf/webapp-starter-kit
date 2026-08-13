import { getRouteApi, useLocation, useNavigate } from "@tanstack/react-router"

import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Button } from "@/components/ui/button"
import { useNoteDirty } from "@/contexts/note-editor-context"
import { m } from "@/i18n"
import { useAuth } from "@/lib/auth/use-auth"
import { NoteSaveIntent } from "@/lib/constants/search"
import { useResumeNoteSave } from "@/lib/hooks/use-note-mutations"

import { NoteEditorFields } from "./note-editor-fields"

const route = getRouteApi("/notes/new")

function statusMessage(status: {
  createFailed: boolean
  isSaving: boolean
  dirty: boolean
}) {
  if (status.createFailed) return m.note_create_error()
  if (status.isSaving) return m.note_creating()
  if (status.dirty) return m.note_unsaved()
  return m.note_draft_hint()
}

export function NewNoteEditor() {
  const search = route.useSearch()
  const navigate = useNavigate()
  const auth = useAuth()
  const dirty = useNoteDirty()

  const saveRequested = search.intent === NoteSaveIntent.SAVE
  // Includes ?intent=save, so the sign-in round-trip lands back mid-save.
  const locationHref = useLocation({ select: (location) => location.href })
  const clearIntent = () =>
    void navigate({ to: "/notes/new", search: {}, replace: true })

  const resume = useResumeNoteSave({
    enabled: saveRequested && auth.isAuthenticated,
    onSaved: (publicId) =>
      void navigate({ to: "/n/$publicId", params: { publicId } }),
    onAbandoned: clearIntent,
  })

  const requestSave = () => {
    void navigate({
      to: "/notes/new",
      search: { intent: NoteSaveIntent.SAVE },
      replace: true,
    })
  }

  return (
    <>
      <NoteEditorFields
        onSubmit={requestSave}
        status={statusMessage({
          createFailed: resume.hasError,
          isSaving: resume.isSaving,
          dirty,
        })}
        footer={
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={resume.isSaving}>
              {resume.isSaving ? m.note_creating() : m.note_save_action()}
            </Button>
          </div>
        }
      />
      <SignInDialog
        open={!auth.isAuthenticated && saveRequested}
        onOpenChange={(open) => {
          // Dismissing clears the intent so back/forward does not re-open it.
          if (!open) clearIntent()
        }}
        socialProviders={auth.socialProviders}
        redirectPath={locationHref}
      />
    </>
  )
}
