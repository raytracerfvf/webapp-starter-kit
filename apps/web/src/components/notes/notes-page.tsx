import { Link } from "@tanstack/react-router"

import { NoteVisibility } from "@repo/shared"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { m } from "@/i18n"
import { useNotesListQuery } from "@/lib/hooks/use-note-queries"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

export function NotesPage() {
  const notes = useNotesListQuery().data
  return (
    <main className={cn(pageWidth, "py-16")}>
      <section>
        <p className="text-sm font-semibold text-primary">
          {m.notes_workspace()}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="t-display">{m.notes_title()}</h1>
          <Button asChild>
            <Link to="/notes/new">{m.notes_new()}</Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-3">
          {notes.length === 0 ? (
            <Card>
              <p className="text-muted-foreground">{m.notes_empty_list()}</p>
            </Card>
          ) : (
            notes.map((note) => (
              <Link
                key={note.publicId}
                to="/n/$publicId"
                params={{ publicId: note.publicId }}
              >
                <Card className="transition-transform hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-bold">{note.title}</h2>
                    <Badge>
                      {note.visibility === NoteVisibility.PRIVATE
                        ? m.note_visibility_private()
                        : m.note_visibility_unlisted()}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
