---
name: new-domain
description: Scaffold a new persisted entity or aggregate across schemas, storage, operations, server boundaries, queries, hooks, UI integration, and tests. Use when a feature introduces an independently stored resource or lifecycle.
user-invocable: false
---

# Add a new domain module

Follow this sequence in order: the table is the root and the graph flows storage → domain, so taking the steps
out of order produces import cycles. If an end-to-end domain currently exists, inspect it for local layering and
file placement without copying its product semantics or naming. The workflow must still work after every
starter example is removed.

Apply the relevant area skills as their layers enter scope. Do not add JSONB, client state, routes, or UI merely
to make every layer appear; implement only what the resource needs.

1. Model the resource. Prefer normalized fields; reach for a JSONB aggregate only when the structure is
   genuinely nested. Decide which bounds belong in the DDL (`varchar(n)`) rather than in Zod alone, and name
   those constants beside the table for reuse at every validation and UI boundary.
2. If the domain has enums: add the const-tuple + `z.enum` source in `packages/shared/src/domain/enums.ts`.
3. If it has public URLs: add the branded public-ID schema + prefix in `packages/shared/src/domain/public-id.ts`.
4. When step 2 added an enum, derive `pgEnum` from the same const source in
   `packages/shared/src/db/schema/enums.ts`.
5. Add `packages/shared/src/db/schema/<domain>.ts` — the root of the type graph. `pgTable`, `cuid()`,
   normalized columns carrying their own bounds, indexes, constraints, and `publicId()` only for a public
   identifier. For the aggregate justified in step 1, declare `<DOMAIN>_SCHEMA_VERSION` and the payload schema
   here as well, with `jsonb(...).$type<Payload>()`, `rowVersion("version")`, and `rowVersionCheck(...)` from
   `packages/shared/src/db/schema/utils.ts`. See `database` for the versioning rules.
6. In the same file, `export const <Domain>RowSchema = createSelectSchema(table, refinements)`, overriding every
   JSONB payload and branded scalar whose runtime shape SQL does not enforce. This module must not import
   `domain/<domain>/**`.
7. Register the table in `packages/shared/src/db/schema/index.ts` and
   `packages/shared/src/db/schema/relations.ts` (sanctioned barrel).
8. `packages/shared/src/domain/<domain>/types.ts` — the `Create*/Update*/*InputSchema` API shapes, reusing the
   table module's named bound constants rather than restating magic numbers or inspecting row-schema internals.
9. `packages/shared/src/domain/<domain>/operations.ts` — operations taking `db: DrizzleExecutor` as the FIRST
   argument; ownership checks in the WHERE clause; no global db/logger/env/request context. With a JSONB
   aggregate this layer is also the version boundary: write a private `to<Domain>(row)` here, and the exported
   domain type is `ReturnType<typeof to<Domain>>`. Build every narrower access projection field-by-field; never
   omit fields from a wider object because a new column would then fail open.
10. Export operations + types from `packages/shared/src/index.ts`.
11. `pnpm db:generate` → review the new SQL in `packages/shared/drizzle/` and the snapshot diff. Never edit
    generated migrations.
12. `apps/web/src/server/<domain>.ts` — one `createServerFn` per operation:
    `.middleware([requireAuthenticatedMiddleware])` where authenticated, `.validator(<InputSchema>)` on every
    input-bearing function, and a handler that maps missing rows to a safe `HttpError`. Do not add a dummy
    validator to a function with no input.
13. `apps/web/src/lib/queries/<domain>.ts` — hierarchical key factory (`all` → `lists()` → `list(input)` →
    `details()` → `detail(id)`), `queryOptions` factories, mutation functions. This is the ONLY file allowed
    to import `@/server/<domain>` (Biome enforces it).
14. `apps/web/src/lib/hooks/use-<domain>-queries.ts` — named read hooks wrapping the query options. Production
    React Query hooks are lint-banned outside `lib/hooks/**`.
15. `apps/web/src/lib/hooks/use-<domain>-mutations.ts` — all the domain's write hooks in one flat file; they
    update/invalidate through the factory and return the invalidation promise.
16. Routes + components when the feature needs them: a page-critical loader calls `ensureQueryData(options)`
    and its component calls the domain read hook backed by the same options. Put search-param schemas in
    `lib/constants/`.
17. Tests per the touched areas (domain operations, migrations, store if any), then the completion gate:
    `pnpm check-all && pnpm test`.
