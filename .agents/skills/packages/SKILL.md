---
name: packages
description: Change workspace layout, package exports, dependency direction, generated-code policy, pnpm catalog entries, or the Python service and generated OpenAPI client. Use before adding dependencies, moving code between workspaces, or editing package manifests, apps/api-python/**, or packages/api-client/**.
user-invocable: false
---

# Packages and boundaries

## Dependency direction

- `apps/web` consumes public exports from `packages/shared`.
- The optional Python service owns its internal router, service, and library layers and exposes an OpenAPI
  contract. The generated API client depends on generated artifacts and shared transport conventions, never on
  web components.
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
  never hand-edited *(enforced: write-guard hook — it names the regeneration command per artifact)*.
- Every generated output has one documented source and one deterministic command. CI regenerates tracked output
  and fails on drift.
- Commit only what build and deploy policy requires; ignore reproducible transient output.
- `apps/api-python/openapi.json` is the committed contract snapshot. The TS client regenerates from it with
  Node-only `openapi-ts` (`pnpm codegen`), so installs never require Python. `pnpm codegen:api-client` refreshes
  the snapshot from the FastAPI app via uv, and CI's Python job regenerates it and fails on drift. Install and
  dev tasks run `pnpm codegen` or its Turbo dependencies so ignored generated output exists locally.

## Dependencies

- Use the pnpm catalog for versions shared by multiple workspaces.
- Pin RC and rapidly changing infrastructure exactly; use ranges only where the plan says so.
- Put a dependency in the workspace that imports it — never rely on hoisting.
- pnpm fails installs on unapproved build scripts. Review any new install script before adding the package to
  `allowBuilds` in `pnpm-workspace.yaml`.
- `packages/api-client` pins `typescript@6` locally because `openapi-ts` consumes the legacy TS compiler API at
  runtime, which TS 7 removed. Its `typecheck` script deliberately runs the root TS 7 `tsc` instead.
- Do not add a library that overlaps a concern the selected stack already owns.

## Required checks

- Workspace typecheck resolves public exports without deep private imports.
- `pnpm analyze` shows no server-only modules in the browser bundle.
- Code generation is deterministic and drift-free.

Refs: `pnpm-workspace.yaml` · root `package.json` · workspace package manifests.
