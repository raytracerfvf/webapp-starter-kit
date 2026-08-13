import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { parseBackfillArgs, runBackfill } from "./backfill-runner"

const batchesOf = (ids: () => string[]) => {
  const calls: Array<{ cursor: string | null; limit: number }> = []
  const fetchBatch = async (cursor: string | null, limit: number) => {
    calls.push({ cursor, limit })
    const remaining = ids().filter((id) => cursor === null || id > cursor)
    return remaining.slice(0, limit).map((id) => ({ id }))
  }
  return { fetchBatch, calls }
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("parseBackfillArgs", () => {
  test("rejects unrecognized flags so a --dry-run typo cannot run a real backfill", () => {
    expect(() => parseBackfillArgs(["--dryrun"])).toThrow("Unknown argument")
  })

  test("parses flags and bounds the batch size", () => {
    expect(parseBackfillArgs([])).toEqual({ dryRun: false, batchSize: 100 })
    expect(parseBackfillArgs(["--dry-run", "--batch-size=2"])).toEqual({
      dryRun: true,
      batchSize: 2,
    })
    expect(() => parseBackfillArgs(["--batch-size=0"])).toThrow("--batch-size")
    expect(() => parseBackfillArgs(["--batch-size=1001"])).toThrow(
      "--batch-size",
    )
  })
})

describe("runBackfill", () => {
  test("paginates by cursor and migrates every row", async () => {
    const { fetchBatch, calls } = batchesOf(() => ["a", "b", "c"])
    const migrated: string[] = []

    const result = await runBackfill({
      label: "test",
      dryRun: false,
      batchSize: 2,
      fetchBatch,
      migrateRow: async (row) => {
        migrated.push(row.id)
        return "migrated" as const
      },
    })

    expect(result).toEqual({ migrated: 3, skipped: 0, failed: 0 })
    expect(migrated).toEqual(["a", "b", "c"])
    expect(calls).toEqual([
      { cursor: null, limit: 2 },
      { cursor: "b", limit: 2 },
      { cursor: "c", limit: 2 },
    ])
  })

  test("counts a failed row and keeps going", async () => {
    const { fetchBatch } = batchesOf(() => ["a", "b", "c"])

    const result = await runBackfill({
      label: "test",
      dryRun: false,
      batchSize: 100,
      fetchBatch,
      migrateRow: async (row) => {
        if (row.id === "b") throw new Error("boom")
        return "migrated" as const
      },
    })

    expect(result).toEqual({ migrated: 2, skipped: 0, failed: 1 })
  })

  test("a row migrated concurrently between fetch and lock is skipped, not overwritten", async () => {
    const store = new Map([
      ["a", { version: 1, data: "old-a" }],
      ["b", { version: 1, data: "old-b" }],
    ])
    const { fetchBatch } = batchesOf(() =>
      [...store.entries()].filter(([, v]) => v.version < 2).map(([id]) => id),
    )

    const result = await runBackfill({
      label: "test",
      dryRun: false,
      batchSize: 10,
      fetchBatch,
      migrateRow: async (row) => {
        if (row.id === "a") {
          store.set("b", { version: 2, data: "fresh-user-save" })
        }
        const current = store.get(row.id)
        if (!current || current.version >= 2) return "skipped" as const
        store.set(row.id, { version: 2, data: `migrated-${current.data}` })
        return "migrated" as const
      },
    })

    expect(result).toEqual({ migrated: 1, skipped: 1, failed: 0 })
    expect(store.get("a")).toEqual({ version: 2, data: "migrated-old-a" })
    expect(store.get("b")).toEqual({ version: 2, data: "fresh-user-save" })
  })
})
