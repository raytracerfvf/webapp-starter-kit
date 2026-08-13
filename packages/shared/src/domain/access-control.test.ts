import { describe, expect, it } from "vitest"

import { AccessLevel, noteAccess } from "./access-control"
import { NoteVisibility } from "./enums"

describe("noteAccess", () => {
  it.each([
    ["owner", NoteVisibility.PRIVATE, AccessLevel.OWNER],
    ["owner", NoteVisibility.UNLISTED, AccessLevel.OWNER],
    ["someone-else", NoteVisibility.UNLISTED, AccessLevel.READ_ONLY],
    ["someone-else", NoteVisibility.PRIVATE, AccessLevel.NONE],
    [null, NoteVisibility.UNLISTED, AccessLevel.READ_ONLY],
    [null, NoteVisibility.PRIVATE, AccessLevel.NONE],
  ])("viewer %s on a %s note gets %s", (viewerId, visibility, expected) => {
    expect(noteAccess({ ownerId: "owner", viewerId, visibility })).toBe(
      expected,
    )
  })
})
