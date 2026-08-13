import { Card } from "@/components/ui/card"
import { NoteEditorProvider } from "@/contexts/note-editor-context"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

import { NewNoteEditor } from "./new-note-editor"

export function NewNotePage() {
  return (
    <NoteEditorProvider>
      <main className={cn(pageWidth, "py-16")}>
        <Card className="mx-auto max-w-3xl">
          <NewNoteEditor />
        </Card>
      </main>
    </NoteEditorProvider>
  )
}
