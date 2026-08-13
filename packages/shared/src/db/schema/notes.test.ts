import { describe, expect, it } from "vitest"

import { NOTE_TITLE_MAX_LENGTH, NoteRowSchema } from "./notes"

describe("note row schemas", () => {
  it("validates the JSONB payload instead of accepting arbitrary JSON", () => {
    expect(
      NoteRowSchema.shape.content.safeParse({ text: "valid" }).success,
    ).toBe(true)
    expect(NoteRowSchema.shape.content.safeParse({ nope: 1 }).success).toBe(
      false,
    )
    expect(
      NoteRowSchema.shape.content.safeParse({ text: "valid", future: true })
        .success,
    ).toBe(false)
  })

  it("preserves the branded public id validator", () => {
    expect(NoteRowSchema.shape.publicId.safeParse("note_valid").success).toBe(
      true,
    )
    expect(NoteRowSchema.shape.publicId.safeParse("nope").success).toBe(false)
  })

  it("preserves nullable select columns without a value override", () => {
    expect(NoteRowSchema.shape.deletedAt.safeParse(null).success).toBe(true)
  })

  it("takes the title bound from the database column", () => {
    expect(
      NoteRowSchema.shape.title.safeParse("x".repeat(NOTE_TITLE_MAX_LENGTH))
        .success,
    ).toBe(true)
    expect(
      NoteRowSchema.shape.title.safeParse("x".repeat(NOTE_TITLE_MAX_LENGTH + 1))
        .success,
    ).toBe(false)
  })
})
