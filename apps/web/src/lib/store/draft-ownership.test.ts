import { describe, expect, it } from "vitest"

import { NotePublicIdSchema } from "@repo/shared"

import { clearAllNoteDrafts, reconcileDraftOwner } from "./draft-ownership"
import { NEW_NOTE_DRAFT_KEY, noteDraftKey } from "./note-editor-store"
import { memoryStorage } from "./test-storage"

const UNRELATED_KEY = "webapp:theme"

function seedDrafts(storage: Storage) {
  storage.setItem(NEW_NOTE_DRAFT_KEY, "anonymous draft")
  storage.setItem(
    noteDraftKey("user-a", NotePublicIdSchema.parse("note_owned")),
    "user-a draft",
  )
  storage.setItem(UNRELATED_KEY, "kept")
}

describe("draft ownership", () => {
  it("leaves drafts alone while signed out", () => {
    const storage = memoryStorage()
    seedDrafts(storage)
    reconcileDraftOwner(storage, null)
    expect(storage.getItem(NEW_NOTE_DRAFT_KEY)).toBe("anonymous draft")
  })

  it("adopts anonymous drafts on the first sign-in", () => {
    const storage = memoryStorage()
    seedDrafts(storage)
    reconcileDraftOwner(storage, "user-a")
    expect(storage.getItem(NEW_NOTE_DRAFT_KEY)).toBe("anonymous draft")
  })

  it("keeps drafts for the same returning account", () => {
    const storage = memoryStorage()
    reconcileDraftOwner(storage, "user-a")
    seedDrafts(storage)
    reconcileDraftOwner(storage, "user-a")
    expect(storage.getItem(NEW_NOTE_DRAFT_KEY)).toBe("anonymous draft")
  })

  it("wipes drafts left by a different account", () => {
    const storage = memoryStorage()
    reconcileDraftOwner(storage, "user-a")
    seedDrafts(storage)
    reconcileDraftOwner(storage, "user-b")
    expect(storage.getItem(NEW_NOTE_DRAFT_KEY)).toBeNull()
    expect(
      storage.getItem(
        noteDraftKey("user-a", NotePublicIdSchema.parse("note_owned")),
      ),
    ).toBeNull()
    expect(storage.getItem(UNRELATED_KEY)).toBe("kept")
  })

  it("clearing drafts also resets ownership, so the next sign-in adopts", () => {
    const storage = memoryStorage()
    reconcileDraftOwner(storage, "user-a")
    seedDrafts(storage)
    clearAllNoteDrafts(storage)
    expect(storage.getItem(NEW_NOTE_DRAFT_KEY)).toBeNull()
    expect(storage.getItem(UNRELATED_KEY)).toBe("kept")
    // A fresh anonymous draft written after sign-out belongs to whoever
    // signs in next, even a different account.
    storage.setItem(NEW_NOTE_DRAFT_KEY, "post-sign-out draft")
    reconcileDraftOwner(storage, "user-b")
    expect(storage.getItem(NEW_NOTE_DRAFT_KEY)).toBe("post-sign-out draft")
  })
})
