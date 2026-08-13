import { createServerFn } from "@tanstack/react-start"

import {
  CreateNoteInputSchema,
  createNote as createNoteOperation,
  deleteNote as deleteNoteOperation,
  getNoteByPublicId,
  listNotes,
  NotePublicIdInputSchema,
  UpdateNoteInputSchema,
  updateNote as updateNoteOperation,
} from "@repo/shared"

import { requireAuthenticatedMiddleware } from "@/lib/auth/middleware"
import { readServerSession } from "@/lib/auth/session.server"
import { db } from "@/lib/db.server"
import { throwNotFound } from "@/lib/errors.server"
import { zodValidator } from "@/lib/server-fn-validator"

export const listNotesFn = createServerFn({ method: "GET" })
  .middleware([requireAuthenticatedMiddleware])
  .handler(({ context }) => listNotes(db, context.userId))

export const getNoteByPublicIdFn = createServerFn({ method: "GET" })
  .validator(zodValidator(NotePublicIdInputSchema))
  .handler(async ({ data }) => {
    const session = await readServerSession()
    const note = await getNoteByPublicId(
      db,
      data.publicId,
      session?.user.id ?? null,
    )
    if (!note) throwNotFound("Note not found", { publicId: data.publicId })
    return note
  })

export const createNoteFn = createServerFn({ method: "POST" })
  .middleware([requireAuthenticatedMiddleware])
  .validator(zodValidator(CreateNoteInputSchema))
  .handler(({ context, data }) => createNoteOperation(db, context.userId, data))

export const updateNoteFn = createServerFn({ method: "POST" })
  .middleware([requireAuthenticatedMiddleware])
  .validator(zodValidator(UpdateNoteInputSchema))
  .handler(async ({ context, data }) => {
    const note = await updateNoteOperation(db, context.userId, data)
    if (!note) throwNotFound("Note not found", { publicId: data.publicId })
    return note
  })

export const deleteNoteFn = createServerFn({ method: "POST" })
  .middleware([requireAuthenticatedMiddleware])
  .validator(zodValidator(NotePublicIdInputSchema))
  .handler(async ({ context, data }) => {
    const note = await deleteNoteOperation(db, context.userId, data.publicId)
    if (!note) throwNotFound("Note not found", { publicId: data.publicId })
    return note
  })
