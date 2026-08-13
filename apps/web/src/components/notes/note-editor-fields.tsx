import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { RotateCcw, RotateCw } from "lucide-react"
import { type KeyboardEvent, type ReactNode, useId } from "react"
import { Controller, useForm } from "react-hook-form"

import {
  type CreateNoteInput,
  CreateNoteInputSchema,
  NOTE_TEXT_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  NoteVisibility,
} from "@repo/shared"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  useCanRedo,
  useCanUndo,
  useNoteContent,
  useNoteRedo,
  useNoteTitle,
  useNoteUndo,
  useNoteVisibility,
  useSetNoteText,
  useSetNoteTitle,
  useSetNoteVisibility,
} from "@/contexts/note-editor-context"
import { m } from "@/i18n"

export function NoteEditorFields({
  status,
  toolbar,
  footer,
  onSubmit,
}: {
  status: ReactNode
  toolbar?: ReactNode
  footer?: ReactNode
  onSubmit?: (draft: CreateNoteInput) => void | Promise<void>
}) {
  const title = useNoteTitle()
  const text = useNoteContent().text
  const visibility = useNoteVisibility()
  const setTitle = useSetNoteTitle()
  const setText = useSetNoteText()
  const setVisibility = useSetNoteVisibility()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const undo = useNoteUndo()
  const redo = useNoteRedo()
  const errorId = useId()
  const titleErrorId = `${errorId}-title`
  const textErrorId = `${errorId}-text`
  const form = useForm<CreateNoteInput>({
    resolver: standardSchemaResolver(CreateNoteInputSchema),
    values: { title, content: { text }, visibility },
    mode: "onChange",
  })
  // Controlled fields disable native undo, so the editor owns the shortcut.
  const handleHistoryKeys = (event: KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z")
      return
    event.preventDefault()
    if (event.shiftKey) redo()
    else undo()
  }
  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit?.(values))}
      noValidate
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canUndo}
            aria-label={m.note_undo()}
            onClick={undo}
          >
            <RotateCcw size={17} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canRedo}
            aria-label={m.note_redo()}
            onClick={redo}
          >
            <RotateCw size={17} />
          </Button>
          {toolbar}
        </div>
        <p className="text-xs text-muted-foreground" role="status">
          {status}
        </p>
      </div>
      <Controller
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <>
            <Input
              {...field}
              className="mt-6 h-auto border-0 px-0 text-3xl font-bold shadow-none"
              maxLength={NOTE_TITLE_MAX_LENGTH}
              onChange={(event) => {
                field.onChange(event)
                setTitle(event.target.value)
              }}
              onKeyDown={handleHistoryKeys}
              aria-label={m.note_title_aria()}
              aria-invalid={fieldState.invalid || undefined}
              aria-describedby={fieldState.invalid ? titleErrorId : undefined}
            />
            {fieldState.invalid ? (
              <p
                id={titleErrorId}
                className="mt-2 text-sm text-destructive"
                role="alert"
              >
                {m.note_title_validation()}
              </p>
            ) : null}
          </>
        )}
      />
      <Controller
        control={form.control}
        name="content.text"
        render={({ field, fieldState }) => (
          <>
            <Textarea
              {...field}
              className="mt-5 min-h-80 border-0 px-0 text-base leading-7 shadow-none"
              maxLength={NOTE_TEXT_MAX_LENGTH}
              onChange={(event) => {
                field.onChange(event)
                setText(event.target.value)
              }}
              onKeyDown={handleHistoryKeys}
              aria-label={m.note_body_aria()}
              aria-invalid={fieldState.invalid || undefined}
              aria-describedby={fieldState.invalid ? textErrorId : undefined}
            />
            {fieldState.invalid ? (
              <p
                id={textErrorId}
                className="mt-2 text-sm text-destructive"
                role="alert"
              >
                {m.note_text_validation()}
              </p>
            ) : null}
          </>
        )}
      />
      <Controller
        control={form.control}
        name="visibility"
        render={({ field }) => (
          <div className="mt-5 flex items-center gap-2 text-sm">
            <Switch
              id="note-editor-share"
              checked={field.value === NoteVisibility.UNLISTED}
              onCheckedChange={(checked) => {
                const visibility = checked
                  ? NoteVisibility.UNLISTED
                  : NoteVisibility.PRIVATE
                field.onChange(visibility)
                setVisibility(visibility)
              }}
              onBlur={field.onBlur}
            />
            <Label htmlFor="note-editor-share">{m.note_share_label()}</Label>
          </div>
        )}
      />
      {footer}
    </form>
  )
}
