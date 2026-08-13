import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { NOTE_TEXT_MAX_LENGTH } from "@repo/shared"

import { NoteEditorProvider } from "@/contexts/note-editor-context"
import { m } from "@/i18n"

import { NoteEditorFields } from "./note-editor-fields"

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("NoteEditorFields", () => {
  it("associates React Hook Form validation errors with their fields", async () => {
    render(
      <NoteEditorProvider>
        <NoteEditorFields
          status="Draft"
          footer={<button type="submit">Save</button>}
        />
      </NoteEditorProvider>,
    )

    const title = screen.getByLabelText(m.note_title_aria())
    const text = screen.getByLabelText(m.note_body_aria())
    fireEvent.change(text, {
      target: { value: "x".repeat(NOTE_TEXT_MAX_LENGTH + 1) },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText(m.note_title_validation())).toBeDefined()
    expect(await screen.findByText(m.note_text_validation())).toBeDefined()
    expect(title.getAttribute("aria-invalid")).toBe("true")
    expect(text.getAttribute("aria-invalid")).toBe("true")
    expect(title.getAttribute("aria-describedby")).not.toBeNull()
    expect(text.getAttribute("aria-describedby")).not.toBeNull()
  })
})
