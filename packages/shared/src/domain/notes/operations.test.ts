import { sql } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { ZodError } from "zod"

import { createTestDb, createTestUser, type TestDb } from "../../db/test-db"
import { AccessLevel } from "../access-control"
import { NoteVisibility } from "../enums"
import {
  createNote,
  deleteNote,
  getNoteByPublicId,
  listNotes,
  updateNote,
} from "./operations"

let db: TestDb
let owner: string
let stranger: string

beforeAll(async () => {
  db = await createTestDb()
  owner = await createTestUser(db, "owner")
  stranger = await createTestUser(db, "stranger")
})

function makeNote(visibility: NoteVisibility = NoteVisibility.PRIVATE) {
  return createNote(db, owner, {
    title: "Title",
    content: { text: "Body text" },
    visibility,
  })
}

describe("createNote", () => {
  it("stamps storage and returns a projected owner value", async () => {
    const note = await makeNote()
    expect(note.content).toEqual({ text: "Body text" })
    expect(note).not.toHaveProperty("id")
    expect(note).not.toHaveProperty("version")
    expect(note).not.toHaveProperty("deletedAt")

    const raw = await db.execute(
      sql`select version, content from notes where public_id = ${note.publicId}`,
    )
    expect(raw.rows[0]?.version).toBe(1)
    expect(raw.rows[0]?.content).toEqual({ text: "Body text" })
  })
})

describe("storage constraints and decoding", () => {
  it("enforces the title length in the database", async () => {
    await expect(
      db.execute(sql`
        insert into notes (id, public_id, owner_id, title, content, version)
        values ('over-long', 'note_overlong', ${owner}, ${"x".repeat(161)},
                '{"text":""}'::jsonb, 1)
      `),
    ).rejects.toThrow()
  })

  it("refuses a row written by a newer schema", async () => {
    const note = await makeNote()
    await db.execute(
      sql`update notes set version = version + 1 where public_id = ${note.publicId}`,
    )
    await expect(getNoteByPublicId(db, note.publicId, owner)).rejects.toThrow(
      "expected 1",
    )
  })

  it("reports corrupt content as a server fault", async () => {
    const note = await makeNote()
    await db.execute(
      sql`update notes set content = '{"nope":1}'::jsonb where public_id = ${note.publicId}`,
    )
    const error = await getNoteByPublicId(db, note.publicId, owner).catch(
      (thrown: unknown) => thrown,
    )
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(ZodError)
    expect(error).toMatchObject({ message: "Failed to decode stored note row" })
  })
})

describe("getNoteByPublicId", () => {
  it("returns the full domain projection to the owner", async () => {
    const note = await makeNote()
    const read = await getNoteByPublicId(db, note.publicId, owner)
    expect(read).toMatchObject({
      publicId: note.publicId,
      ownerId: owner,
      access: AccessLevel.OWNER,
    })
    expect(read).not.toHaveProperty("id")
    expect(read).not.toHaveProperty("deletedAt")
  })

  it("allow-lists the exact read-only projection", async () => {
    const note = await makeNote(NoteVisibility.UNLISTED)
    const read = await getNoteByPublicId(db, note.publicId, stranger)
    expect(read).toEqual({
      access: AccessLevel.READ_ONLY,
      publicId: note.publicId,
      title: "Title",
      content: { text: "Body text" },
      updatedAt: note.updatedAt,
    })
  })

  it("hides private notes from other users and anonymous viewers", async () => {
    const note = await makeNote()
    expect(await getNoteByPublicId(db, note.publicId, stranger)).toBeNull()
    expect(await getNoteByPublicId(db, note.publicId, null)).toBeNull()
  })
})

describe("ownership and live-row scoping", () => {
  it("rejects a forged public id/owner pair", async () => {
    const note = await makeNote()
    const result = await updateNote(db, stranger, {
      publicId: note.publicId,
      title: "Hijacked",
      content: { text: "Hijacked" },
      visibility: NoteVisibility.UNLISTED,
    })
    expect(result).toBeNull()
    const unchanged = await getNoteByPublicId(db, note.publicId, owner)
    expect(unchanged?.title).toBe("Title")
  })

  it("updates a live note for its owner", async () => {
    const note = await makeNote()
    const updated = await updateNote(db, owner, {
      publicId: note.publicId,
      title: "Renamed",
      content: { text: "New content" },
      visibility: NoteVisibility.UNLISTED,
    })
    expect(updated).toMatchObject({
      title: "Renamed",
      content: { text: "New content" },
      visibility: NoteVisibility.UNLISTED,
    })
  })

  it("soft deletes once and excludes the tombstone everywhere", async () => {
    const note = await makeNote()
    expect(await deleteNote(db, stranger, note.publicId)).toBeNull()
    expect(await deleteNote(db, owner, note.publicId)).toEqual({
      publicId: note.publicId,
    })

    const raw = await db.execute(
      sql`select deleted_at as "deletedAt" from notes where public_id = ${note.publicId}`,
    )
    expect(raw.rows[0]?.deletedAt).not.toBeNull()
    expect(await getNoteByPublicId(db, note.publicId, owner)).toBeNull()
    expect(
      (await listNotes(db, owner)).some(
        (summary) => summary.publicId === note.publicId,
      ),
    ).toBe(false)
    expect(
      await updateNote(db, owner, {
        publicId: note.publicId,
        title: "Resurrected",
        content: { text: "No" },
        visibility: NoteVisibility.PRIVATE,
      }),
    ).toBeNull()
    expect(await deleteNote(db, owner, note.publicId)).toBeNull()
  })

  it("lists only content-free summaries owned by the viewer", async () => {
    const note = await makeNote()
    const ownerList = await listNotes(db, owner)
    const summary = ownerList.find(
      (candidate) => candidate.publicId === note.publicId,
    )
    expect(summary).toEqual({
      publicId: note.publicId,
      title: note.title,
      visibility: note.visibility,
      updatedAt: note.updatedAt,
    })
    expect(summary).not.toHaveProperty("content")

    const strangerList = await listNotes(db, stranger)
    expect(
      strangerList.some((candidate) => candidate.publicId === note.publicId),
    ).toBe(false)
  })
})
