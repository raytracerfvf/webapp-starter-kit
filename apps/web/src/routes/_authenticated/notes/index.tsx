import { createFileRoute } from "@tanstack/react-router"

import { NotesPage } from "@/components/notes/notes-page"
import { NotesPageSkeleton } from "@/components/notes/notes-page-skeleton"
import { notesListOptions } from "@/lib/queries/notes"

export const Route = createFileRoute("/_authenticated/notes/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(notesListOptions())
  },
  pendingComponent: NotesPageSkeleton,
  component: NotesPage,
})
