---
name: new-store
description: Scaffold a feature-scoped Zustand store with the repository's factory, provider, selector, action, and test patterns. Use for shared or remount-stable client state, coordinated actions, or imperative subscriptions. Do not use for server cache, URL or form state, or one-component state; add persistence, undo/redo, hydration, or autosave only when required.
user-invocable: false
---

# Create a feature-scoped Zustand store

Read the `state-management` skill first. Create only the capabilities the feature needs.

1. Confirm Zustand owns the value (AGENTS.md ownership table). If Query, search params, React Hook Form, or
   `useState` owns it, stop.
2. Factory: `apps/web/src/lib/store/<feature>-store.ts` — vanilla `createStore` with explicit init props; every
   state field and action present in the initial state.
3. Selectors, only for parameterized, composite, or derived reads:
   `apps/web/src/lib/store/<feature>-store-selectors.ts`.
4. Provider and hooks: `apps/web/src/contexts/<feature>-context.tsx` — one lazy instance enhanced with
   `Object.assign(baseStore, createSelectorHooks(baseStore))`, keyed by resource and user identity where
   relevant. Export focused atomic hooks, bound selector hooks, and `use<Feature>Api`.
5. Optional capabilities, each per its `state-management` section: persistence (`<feature>-storage.ts`), undo
   and redo (`temporal`), imperative subscriptions (`subscribeWithSelector`), autosave (a lifecycle hook in
   `lib/hooks/use-<domain>-mutations.ts`).
6. Tests from the `state-management` required-test list for the capabilities you added — at minimum actions and
   transitions, provider isolation, and the missing-provider error.

Inspect the nearest existing store for local style without copying its semantics. Run focused tests while
iterating, then `pnpm check-all && pnpm test`.
