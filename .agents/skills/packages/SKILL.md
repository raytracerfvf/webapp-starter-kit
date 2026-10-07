---
name: packages
description: Change workspace layout, package exports, dependency direction, generated-code policy, pnpm catalog entries, or the Python service and generated OpenAPI client. Use before adding dependencies, moving code between workspaces, or editing package manifests, apps/api-python/**, or packages/api-client/**.
user-invocable: false
---

# Packages and boundaries

## Dependency direction

- `apps/web` consumes public exports from `packages/shared`.
- The optional Python service exposes only its OpenAPI contract; `packages/api-client` is generated from it and
  never imports web code.
- Circular workspace dependencies are forbidden.

## Shared package

- Source TypeScript is consumed directly — no build or dist layer for a private monorepo.
- Export explicit subpaths. Exactly four barrels are allowed *(enforced: Biome, exemption list in
  `biome.json`)*: `apps/web/i18n/index.ts`, `packages/shared/src/index.ts`, `packages/shared/src/db/index.ts`,
  `packages/shared/src/db/schema/index.ts`.
- Block DB clients and server-only modules from browser-consumable exports.
- Schemas, types, pure transformations, and executor-parameterized operations go under `domain/`; Drizzle
  storage definitions go under `db/`.

## Generated code

- Generated route trees, auth schema, API clients, i18n output, content indexes, and Drizzle snapshots are
  never hand-edited *(enforced for Write/Edit by the write-guard hook, which names each regeneration step)*.
- Every generated output has one documented source and one deterministic command. CI drift-checks only Drizzle
  output and `openapi.json`; review diffs to the other tracked outputs (`routeTree.gen.ts`, `auth.gen.ts`) by
  hand.
- `apps/api-python/openapi.json` is the committed contract snapshot. The TS client regenerates from it with
  Node-only `openapi-ts` (`pnpm codegen`), so installs never require Python. `pnpm codegen:api-client` refreshes
  the snapshot from the FastAPI app via uv, and CI's `quality` job regenerates it and fails on drift. Install
  and dev tasks run `pnpm codegen` or its Turbo dependencies so ignored generated output exists locally.

## Dependencies

- Use the pnpm catalog for versions shared by multiple workspaces.
- Pin RC and rapidly changing infrastructure exactly; use ranges only as a deliberate choice.
- Put a dependency in the workspace that imports it — never rely on hoisting.
- `packages/api-client` pins `typescript@6` locally because `openapi-ts` consumes the legacy TS compiler API at
  runtime, which TS 7 removed. Its `typecheck` script deliberately runs the root TS 7 `tsc` instead.
- Do not add a library that overlaps a concern the selected stack already owns.

## Required checks

- Workspace typecheck resolves public exports without deep private imports.
- `pnpm analyze` shows no server-only modules in the browser bundle.
- Code generation is deterministic and drift-free.

Refs: `pnpm-workspace.yaml` · root `package.json` · workspace package manifests.
