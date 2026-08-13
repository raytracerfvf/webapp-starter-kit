import { relations } from "drizzle-orm"

import { user } from "./auth.gen"
import { notes } from "./notes"

export const notesRelations = relations(notes, ({ one }) => ({
  owner: one(user, { fields: [notes.ownerId], references: [user.id] }),
}))

export const userApplicationRelations = relations(user, ({ many }) => ({
  notes: many(notes),
}))
