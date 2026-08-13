---
name: new-store
description: Scaffold a feature-scoped Zustand store with the repository's factory, provider, selector, action, and test patterns. Use for shared or remount-stable client state, coordinated actions, or imperative subscriptions. Do not use for server cache, URL or form state, or one-component state; add persistence, undo/redo, hydration, or autosave only when required.
user-invocable: false
---

# Create a feature-scoped Zustand store

Read the `state-management` skill first. Create only the capabilities the feature needs.

1. Confirm Zustand owns the value: Query owns server cache, router search params own URL state, React Hook Form
   owns form interaction, `useState` owns state local to one component.
2. Add `apps/web/src/lib/store/<feature>-store.ts` with a vanilla `createStore` factory. Accept explicit
   initialization props; depend on no React, routes, global data, or singleton. Define clear state and actions,
   and add only the middleware the feature justifies.
3. If the feature needs parameterized, composite, or derived reads, add
   `apps/web/src/lib/store/<feature>-store-selectors.ts`. A composite must be one semantic value — if you
   cannot name it without "and", it is a bag. Use `useShallow` for newly assembled objects or arrays.
4. Add `apps/web/src/contexts/<feature>-context.tsx`. Create one store instance lazily, attach
   `createSelectorHooks` exactly once after middleware composition, and expose the enhanced store through
   context. Re-export the generated atomic state and action hooks, and bind custom selector hooks from the
   selector module. Keep a separately named `use<Feature>StoreApi` for imperative integrations; components use
   the focused hooks.
5. Preserve middleware types with `Object.assign(baseStore, createSelectorHooks(baseStore))` — never recover
   them with a type assertion. Every state field and action must exist in the initial state, because selector
   generation enumerates those keys once.
6. Add store tests for actions and state transitions, plus provider tests for isolation and missing-provider
   errors. Add identity-switching, atomic subscription granularity, and selector stability/reactivity tests when
   the feature has those concerns.

Add optional capabilities only when required:

- **Persistence or hydration** — add `<feature>-storage.ts`, validate browser storage with Zod, persist the
  minimum state, version the stored shape, and define deliberate hydration and migration behavior.
- **Undo and redo** — add `temporal` with a narrow `partialize`, explicit history boundaries, and tests for
  inclusion, exclusion, limits, and pause/resume.
- **Imperative subscriptions** — add `subscribeWithSelector`; whoever subscribes owns cleanup.
- **Autosave** — add a lifecycle hook that serializes writes, owns debounce cancellation, and updates or
  invalidates through the query-key factory.

Run focused tests while iterating, then `pnpm check-all && pnpm test`.
