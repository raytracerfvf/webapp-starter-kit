import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router"

import { AccessLevel, NotePublicIdSchema } from "@repo/shared"

import { NoteDetailSkeleton } from "@/components/notes/note-detail-skeleton"
import { NoteEditor } from "@/components/notes/note-editor"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { NoteEditorProvider } from "@/contexts/note-editor-context"
import { m } from "@/i18n"
import { useAuth } from "@/lib/auth/use-auth"
import { decodeHttpError } from "@/lib/errors"
import { useNoteDetailQuery } from "@/lib/hooks/use-note-queries"
import { noteDetailOptions } from "@/lib/queries/notes"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

export const Route = createFileRoute("/n/$publicId")({
  loader: async ({ context, params }) => {
    const parsed = NotePublicIdSchema.safeParse(params.publicId)
    if (!parsed.success) throw notFound()
    try {
      await context.queryClient.ensureQueryData(noteDetailOptions(parsed.data))
      return { publicId: parsed.data }
    } catch (error) {
      // Missing and private notes are indistinguishable by design.
      if (decodeHttpError(error)?.statusCode === 404) throw notFound()
      throw error
    }
  },
  pendingComponent: NoteDetailSkeleton,
  component: PublicNotePage,
})

function PublicNotePage() {
  const { publicId } = Route.useLoaderData()
  const note = useNoteDetailQuery(publicId).data
  const auth = useAuth()
  const navigate = useNavigate()
  return (
    <main className={cn(pageWidth, "py-16")}>
      <Card className="mx-auto max-w-3xl">
        {note.access === AccessLevel.OWNER && auth.user ? (
          <NoteEditorProvider
            key={`${auth.user.id}:${note.publicId}`}
            saved={{ note, userId: auth.user.id }}
          >
            <NoteEditor onDeleted={() => void navigate({ to: "/notes" })} />
          </NoteEditorProvider>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <h1 className="t-title">{note.title}</h1>
              {/* Read-only access exists only for unlisted notes. */}
              <Badge>{m.note_visibility_unlisted()}</Badge>
            </div>
            <p className="mt-8 whitespace-pre-wrap leading-7">
              {note.content.text || m.note_empty_sentence()}
            </p>
          </>
        )}
      </Card>
    </main>
  )
}
