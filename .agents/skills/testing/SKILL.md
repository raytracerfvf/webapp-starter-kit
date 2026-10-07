---
name: testing
description: Write, organize, and review concise tests around feature behavior, architectural boundaries, and regressions across unit, store, component, server, type-level, and drift layers. Use before adding, restructuring, or auditing tests, or when a test passes alone but fails in the full Vitest suite.
user-invocable: false
---

# Testing

## Strategy

Start from a feature risk, architectural boundary, or regression — never from a file, function, or coverage
gap. Name the behavior that must remain true, then prove it at the smallest layer that owns it. Give each
behavior one primary test home; add another layer only when that integration boundary can fail independently.

Before adding a test, ask:

1. What user-visible behavior, security property, data invariant, or past failure does it protect?
2. What is the lowest layer that can prove it without mocking the subject itself?
3. Would this test catch a realistic defect that the existing suite would miss?

If those answers are unclear, do not add the test. Bug fixes get the smallest regression test that fails before
the fix. Prefer table-driven cases for input variants and one coherent lifecycle test over many setup-heavy
micro-tests.

Do not test:

- pass-through wrappers, constants, type-only aliases, or one-line derivations;
- framework, library, or generated-code behavior the project does not customize;
- the same validation rule at schema, server, hook, and component layers;
- internal element counts, object shape, call order, or exact timing unless they are a deliberate contract or
  named regression;
- large snapshots that obscure which behavior matters.

At a boundary, test the boundary's responsibility. A shared schema owns validation cases; a server-function
test proves the validator is attached and authorization middleware is present; a component test proves the
user can complete the feature and receives useful feedback. Do not repeat the schema's case table in every
consumer.

## Layers

- **Pure unit** — schemas, operations, selectors, migrations, query keys, formatting, error mapping.
- **Store** — vanilla factories, middleware, history, persistence, subscriptions, without React where possible.
- **Component/provider** — hooks, isolation, rendering, forms, accessibility, cleanup.
- **Server** — validation, auth and authorization, transactions, error sanitization, request context.
- **Build/contract** — generated drift, type inference, server-only boundaries, React Compiler output, bundles.

Harnesses (copy style from the nearest test in the same layer):

- Real SQL domain tests: `createTestDb()` and `createTestUser()` from `packages/shared/src/db/test-db.ts` —
  in-memory PGlite with migrations applied. Create one per test file; never share an instance.
- Server-function boundaries: mock `@tanstack/react-start` so `createServerFn` is the recorder from
  `apps/web/src/server/test-boundary-recorder.ts`, then assert the attached middleware, validator, and method.

## Placement

- Colocate as `*.test.ts` / `*.test.tsx`.
- Compile-only assertions go in clearly named `*.test-d.ts` fixtures included by typecheck.
- The optional Python service keeps its tests under its own `tests/`, mirroring service boundaries.
- Generated code is tested through its source contract and deterministic generation, never through
  hand-authored snapshots.

## Isolation

`isolate: false` means module state leaks between files. Reset fake timers, mocks,
environment mutations, and module singletons explicitly; reach for `vi.resetModules()` or a per-file isolated
project only for code that genuinely needs fresh evaluation.

## Area test lists

Each area skill closes with a required-test list. Treat it as a risk catalog for behavior changed in that area,
not a requirement to create a separate test for every listed item or touched layer. Reuse an existing
higher-signal test when it already proves the behavior.

## Browser automation

Browser automation is outside the current project strategy. Do not add Playwright, Cypress, or another browser
runner without an explicit architecture decision and a concrete critical flow that the existing layers cannot
prove economically.

Refs: `apps/web/vitest.config.ts` · `packages/shared/vitest.config.ts`.
