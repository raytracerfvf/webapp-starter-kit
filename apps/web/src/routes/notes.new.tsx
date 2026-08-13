import { createFileRoute } from "@tanstack/react-router"

import { NewNotePage } from "@/components/notes/new-note-page"
import { NewNoteSkeleton } from "@/components/notes/new-note-skeleton"
import { NewNoteSearchSchema } from "@/lib/constants/search"

// Deliberately outside the _authenticated group: drafting is anonymous, only
// saving requires a session (enforced server-side by createNoteFn).
export const Route = createFileRoute("/notes/new")({
  // The draft lives in localStorage: rendering this route on the server would
  // be a hydration mismatch.
  ssr: false,
  validateSearch: NewNoteSearchSchema,
  pendingComponent: NewNoteSkeleton,
  component: NewNotePage,
})
