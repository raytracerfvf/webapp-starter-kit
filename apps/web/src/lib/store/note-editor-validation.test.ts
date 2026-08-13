import { describe, expect, it } from "vitest"

import { NOTE_TEXT_MAX_LENGTH, NoteVisibility } from "@repo/shared"

import { validateNoteDraft } from "./note-editor-validation"

describe("validateNoteDraft", () => {
  it("returns normalized input for a valid draft", () => {
    const validation = validateNoteDraft({
      title: "  A useful title  ",
      content: { text: "Draft body" },
      visibility: NoteVisibility.PRIVATE,
    })

    expect(validation.success).toBe(true)
    if (validation.success) {
      expect(validation.data.title).toBe("A useful title")
    }
  })

  it("rejects an invalid draft", () => {
    const validation = validateNoteDraft({
      title: " ",
      content: { text: "x".repeat(NOTE_TEXT_MAX_LENGTH + 1) },
      visibility: NoteVisibility.PRIVATE,
    })

    expect(validation.success).toBe(false)
  })
})
