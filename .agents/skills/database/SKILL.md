---
name: database
description: Design and change Drizzle schemas, SQL migrations, version-stamped JSONB aggregates, backfills, and release ordering. Use before changing packages/shared/src/db/**, shared domain schemas and types, or any persisted data shape.
user-invocable: false
---

# Database and stored-data versioning

## Safety gate

Schema and migration work stays local unless the user explicitly requests a shared-environment operation.
Before any migration or backfill against staging or production, confirm the exact database and a recent
verified backup, and dry-run first. `pnpm db:push` is for disposable local databases only.

## Layering

Drizzle schema defines relational storage · domain modules define pure operations and the decode boundary ·
server functions assemble auth and request context plus an executor.

Seed fixtures are the one deliberate exception to the domain API: `packages/shared/seed/fixtures.ts` holds
executor-parameterized, idempotent Drizzle inserts so seeds can preserve deterministic IDs without adding seed
semantics to production operations. They never use raw SQL, and application code must not import them.

## Schema design

- Normalized columns for anything filtered, ordered, joined, indexed, made unique, or used for ownership or
  policy. JSONB only for genuinely nested aggregates that are validated and versioned.
- Branded public IDs at URL and API boundaries; internal primary keys for joins.
- Column helpers (`cuid`, per-domain public-ID columns, `rowVersion`, `rowVersionCheck`) live in
  `packages/shared/src/db/schema/utils.ts`. Application-owned timestamps are
  `timestamp(…, { withTimezone: true })`.
- Add database constraints for invariants the application must not bypass, including `rowVersionCheck` on the
  row's `version` column.
- Bounds belong in the DDL (`varchar(n)` over `text`), not only in Zod: a validator guards one path, the column
  guards every path. The named bound constant lives beside the table.

## Runtime typing

**The table is the root of the type graph, and the graph flows one way: storage → domain.** Nothing in
`db/schema/**` may import from `domain/<domain>/**`. A contract the table itself needs — a JSONB payload shape —
lives *with* the table. Only the leaf modules `domain/enums.ts` and `domain/public-id.ts` sit below it.

- Derive the row schema beside the table: `createSelectSchema(table, refinements)`. Lengths, nullability, enum
  members, and defaults then come from the DDL. Consumers use the table module's named constants rather than
  inspecting `<Domain>RowSchema.shape.<field>`. Add `createInsertSchema` only when something validates a
  row-shaped payload at runtime.
- Refine only what SQL cannot describe. Refining a length or an enum means the constraint belongs in the DDL.
- A schema-valued refinement replaces the field, optionality included; a callback refinement is wrapped in the
  column's nullable/optional rules afterward. Pin every value override with a test because the failure is
  silent.
- `createSelectSchema` emits permissive runtime schemas for JSONB `$type` payloads and branded text `$type`
  columns. Override both explicitly: generated TypeScript types do not make those runtime validators honest.
- Give JSONB columns `.$type<Payload>()`, else the column infers `unknown` and writes go unchecked. It is a
  compile-time overlay that does not touch the SQL, so the read boundary's parse is what makes it true:
  **type the writes, parse the reads.**
- Domain types come from the projection function (`ReturnType<typeof project<Domain>>`), never a hand-declared
  mirror schema — a Zod record nothing parses at runtime is a type in disguise that needs a drift test to stay
  honest.
- `Create*/Update*InputSchema` are API shapes, not row shapes, so they state their own structure and reuse the
  table module's named bound constants.

## SQL migrations

- Generate from reviewed schema changes (`pnpm db:generate`), then review the SQL and the snapshot diff.
- Applied migrations and the baseline are immutable — never regenerate, rename, reorder, or edit one already
  applied in a shared environment *(enforced for Write/Edit by the write-guard hook)*.
- Additive first. Drops, hard renames, and tightened constraints wait until no code or data depends on the old
  form.
- Deploy migrations before starting code that requires the expanded schema. CI regenerates and fails on drift.

## Version-stamped rows

A table with a JSONB aggregate carries an integer `version` column (`rowVersion`, no database default).

> **`version` records which schema wrote the row. Reads refuse any row whose version is not the one this build
> writes.** One current schema per aggregate, edited in place — no upcasting chain, no per-version directory.

Declare `<DOMAIN>_SCHEMA_VERSION` and `<Domain>PayloadSchema` in the schema module beside the table; the
latter's inferred type is the column's `.$type<…>()` and the refinement the row schema takes. No wrapper helpers
around writes — the column is `notNull` with no default, so the insert type already forces every write to state
a version, and `version: <DOMAIN>_SCHEMA_VERSION` inline reads better than indirection.

Domain operations own the crossing with two private functions written out per domain — no shared versioning
helper; the duplication costs less than an abstraction thin enough to need a callback:

- `project<Domain>(row, payload)` builds the domain object field-by-field and is the type source:
  `export type <Domain> = ReturnType<typeof project<Domain>>`.
- `to<Domain>(row): <Domain>` is the read decoder, in order:
  1. Refuse a row whose `version` is not the one this build writes — below means a backfill has not finished,
     above means this build is older than whatever wrote the row.
  2. Parse the JSONB payload, whose `$type` is only a compile-time overlay. Do not re-parse ordinary relational
     projections; branded public ids are generated on writes and validated when they enter through API inputs.
  3. Wrap a parse failure in a plain `Error`. A bare `ZodError` is sanitized into `400 VALIDATION_ERROR`,
     blaming the caller for corrupt storage.
  4. Return `project<Domain>(row, payload)`. The projection never copies `version` — it is storage metadata and
     nothing downstream may see it.

Writes set `version: <DOMAIN>_SCHEMA_VERSION` inline, skip `to<Domain>`, and call `project<Domain>` with the
payload they just wrote — a row you just wrote needs no verification.

Name the storage row type (`type <Domain>Row = typeof <table>.$inferSelect`) and keep it inside the operations
module: it carries `version`, the domain type does not, and that pair is the boundary.

## Changing a stored JSON shape

**Bumping is the destructive operation.** The guard is an equality check, so raising the version is what makes
un-backfilled rows unreadable. Bump to stop rows being *misread*, never to record that something changed. The
test: **would a row already in the database still parse under the new schema?**

| Change | Still parses? | Do |
|---|---|---|
| New optional field, or one with a default | Yes | Edit the schema. No bump, no backfill |
| Loosened validation (wider max, added enum member) | Yes | Edit the schema. No bump |
| New required field | No | Bump + backfill |
| Rename, remove, retype, or restructure a field | No | Bump + backfill |
| Tightened validation (lower max, removed enum member) | No — stored rows may violate it | Bump + backfill |

Use strict stored-payload objects so an older writer fails instead of silently stripping a field introduced by
a newer build. This means a parse-compatible optional field is not automatically compatible with a mixed-version
rolling deployment: drain old writers first or deploy an explicit compatibility decoder.

Edit `<Domain>PayloadSchema` in place and fix the write-site type errors; no SQL migration, since the `version`
column and its check already exist. If a bump is needed, raise the constant in the same commit and write a
backfill. Zero-downtime for a breaking change is expand/contract: accept both shapes at the read boundary for
one release, backfill, then delete the compatibility branch.

## Backfills

A backfill is a disposable one-off script, never a migration file — bundling the rewrite in means a failure
mid-run rolls back the schema change with it and holds the migration lock throughout.

- Add `packages/shared/scripts/backfill-<name>.ts` with a `db:backfill:<name>` script in
  `packages/shared/package.json` and the root `package.json`. Delete both once the rollout completes.
- Select candidates with `lt(<table>.version, <DOMAIN>_SCHEMA_VERSION)` — a plain, indexable column comparison
  — using keyset pagination and bounded batches.
- One row per transaction unless the domain requires a larger atomic unit.
- Lock and re-read with `SELECT … FOR UPDATE`, then re-check the predicate after locking so rows another
  writer changed or deleted are skipped.
- The transform is a plain function written for this one migration; write back with
  `version: <DOMAIN>_SCHEMA_VERSION` and update dependent relational projections in the same transaction.
- Continue past row-level failures, report them, and exit non-zero so reruns are explicit. Rerunning is safe
  because upgraded rows no longer match.
- Use `packages/shared/scripts/lib/backfill-runner.ts`: `parseBackfillArgs` validates `--dry-run` and
  `--batch-size=`; `runBackfill` returns `{ migrated, skipped, failed }` and touches no process state, so the
  script skips writes on dry-run and sets `process.exitCode = 1` on failures. Run `-- --dry-run` first.

## Release order

Expand/contract:

1. **Expand** — back up, then review and apply an additive migration.
2. **Deploy** readers and writers compatible with both the old and new forms.
3. **Backfill** — dry-run, then run for real; require zero unresolved failures.
4. **Verify** — migration applied, representative old and new paths both work, no old-version data remains.
5. **Contract** — remove compatibility code or old columns in a later release.

Compatible readers ship *before* the backfill so a half-failed step 3 is survivable.

## Required tests

- Schema and type inference fixtures, including a refinement that would fail silently.
- Domain operation authorization and transaction rollback.
- The stored-version guard in both directions: an older row points at the pending backfill, a newer one at the
  lagging deploy.
- Backfill cursor pagination, concurrent-writer skip, dry-run, and partial-failure accounting.
- Migration drift check after generation.

Refs: `packages/shared/src/db/` · `packages/shared/src/domain/` · `packages/shared/scripts/` · workflow
`new-domain`.
