import { describe, expect, it } from "vitest"

import { draftStorage, NOTE_DRAFT_VERSION } from "./note-editor-storage"
import { memoryStorage } from "./test-storage"

describe("draft storage", () => {
  it("discards corrupt and mismatched-version envelopes", () => {
    const raw = memoryStorage()
    const storage = draftStorage(raw)
    raw.setItem("draft", "not-json")
    expect(storage.getItem("draft")).toBeNull()
    raw.setItem(
      "draft",
      JSON.stringify({ state: {}, version: NOTE_DRAFT_VERSION + 1 }),
    )
    expect(storage.getItem("draft")).toBeNull()
  })

  it("removes clean drafts", () => {
    const raw = memoryStorage()
    const storage = draftStorage(raw)
    storage.setItem("draft", {
      version: NOTE_DRAFT_VERSION,
      state: {
        title: "A",
        content: { text: "" },
        visibility: "private",
        lastSaved: {
          title: "A",
          content: { text: "" },
          visibility: "private",
        },
        serverUpdatedAt: 1,
      },
    })
    expect(raw.getItem("draft")).toBeNull()
  })
})
