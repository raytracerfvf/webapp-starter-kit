---
name: testing
description: Write and organize tests across unit, store, component, server, type-level, drift, and browser layers. Use before adding or restructuring tests, or when a test passes alone but fails in the full Vitest suite.
user-invocable: false
---

# Testing

## Layers

- **Pure unit** — schemas, operations, selectors, migrations, query keys, formatting, error mapping.
- **Store** — vanilla factories, middleware, history, persistence, subscriptions, without React where possible.
- **Component/provider** — hooks, isolation, rendering, forms, accessibility, cleanup.
- **Server** — validation, auth and authorization, transactions, error sanitization, request context.
- **Build/contract** — generated drift, type inference, server-only boundaries, React Compiler output, bundles.
- **Browser** — only when multi-page auth, navigation, or hydration behavior justifies the runtime cost.

Use `packages/shared/src/db/test-db.ts` for real SQL domain tests, and the nearest test in the same layer as a
style reference.

## Placement

- Colocate as `*.test.ts` / `*.test.tsx`.
- Compile-only assertions go in clearly named `*.test-d.ts` fixtures included by typecheck.
- The optional Python service keeps its tests under its own `tests/`, mirroring service boundaries.
- Generated code is tested through its source contract and deterministic generation, never through
  hand-authored snapshots.

## Isolation

`isolate: false` buys speed and means module state leaks between files.

- Reset fake timers, mocks, environment mutations, and module singletons explicitly.
- Reach for `vi.resetModules()` or a per-file isolated project only for code that genuinely needs fresh
  evaluation.
- Never depend on execution order.
- A test that passes alone and fails in the suite is an isolation bug. Find the leak — retries and skips hide it.

## Which matrix applies

Each area skill closes with its own required-test list, and those lists are authoritative:

| Area | Skill |
|---|---|
| Stores, selectors, undo, drafts, autosave | `state-management` |
| Query keys, invalidation, validators, authorization, error sanitization | `data-fetching` |
| Stored versions, backfills, schema drift | `database` |
| Routes, loaders, SSR hydration, CSRF | `tanstack-start` |
| Correlation, log privacy | `logging` |
| Auth flows, email | `auth-and-email` |

A change spanning two areas needs both matrices. A bug fix needs the smallest test that would have failed
before the fix — not a new matrix.

## Browser mode

Not yet warranted. Add it when a concrete critical path demands it, starting with auth, SSR hydration,
navigation and search state, draft recovery, and one full CRUD flow. Keep email and OAuth behind local test
modes so browser tests never need production keys, and build fixtures through supported setup rather than
demo routes or seeded records.

Refs: `apps/web/vitest.config.ts` · `packages/shared/vitest.config.ts`.
