export interface BackfillArgs {
  dryRun: boolean
  batchSize: number
}

export function parseBackfillArgs(argv: string[]): BackfillArgs {
  // A --dry-run typo must not silently run a real backfill.
  const unknownArgs = argv.filter(
    (arg) => arg !== "--dry-run" && !arg.startsWith("--batch-size="),
  )
  if (unknownArgs.length > 0) {
    throw new Error(
      `Unknown argument(s): ${unknownArgs.join(", ")}. Supported: --dry-run, --batch-size=<n>`,
    )
  }
  const batchArg = argv.find((arg) => arg.startsWith("--batch-size="))
  const batchSize = batchArg
    ? Number(batchArg.slice("--batch-size=".length))
    : 100
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
    throw new Error("--batch-size must be an integer between 1 and 1000")
  }
  return { dryRun: argv.includes("--dry-run"), batchSize }
}

// Pure keyset loop: callbacks close over their db, so the runner touches no
// connection, argv, or process state.
export async function runBackfill<Row extends { id: string }>(options: {
  label: string
  dryRun: boolean
  batchSize: number
  /** Keyset contract: must be id-ordered and cursor-filtered. */
  fetchBatch: (cursor: string | null, limit: number) => Promise<Row[]>
  /** Runs in dry-run too (skip only the write); report "skipped" when the row is already current. */
  migrateRow: (row: Row) => Promise<"migrated" | "skipped">
}): Promise<{ migrated: number; skipped: number; failed: number }> {
  const { label, dryRun, batchSize, fetchBatch, migrateRow } = options
  let cursor: string | null = null
  let migrated = 0
  let skipped = 0
  let failed = 0

  while (true) {
    const rows = await fetchBatch(cursor, batchSize)
    if (rows.length === 0) break
    for (const row of rows) {
      cursor = row.id
      try {
        const outcome = await migrateRow(row)
        if (outcome === "skipped") skipped++
        else migrated++
      } catch (error) {
        failed++
        console.error(`Failed to migrate ${label} ${row.id}:`, error)
      }
    }
  }

  console.log(
    `${dryRun ? "Would migrate" : "Migrated"} ${migrated} ${label} rows; ${skipped} already current; ${failed} failed`,
  )
  return { migrated, skipped, failed }
}
