---
name: state-management
description: Design or change shared client state with Zustand stores, context providers, selectors, undo/redo, draft persistence, autosave, and React Effects. Use before editing apps/web/src/lib/store/** or apps/web/src/contexts/**, or making complex client-state ownership decisions.
user-invocable: false
---

# State management

## Ownership

AGENTS.md's State ownership section governs: never mirror Query data into a store; a route-scoped editor
snapshots once and owns its draft; RHF and Zustand share an editor without mirroring Effects. In practice the
initializer runs once, there is no prop-sync Effect, and identity changes remount via the route key. Ordinary
forms stay RHF-only.

## Store construction

- Vanilla `createStore` factories, never exported global `create` hooks.
- Factories take explicit init props and depend on nothing else — no React, routes, or global data.
- A provider creates one store lazily, enhances it exactly once with `createSelectorHooks` from
  `auto-zustand-selectors-hook`, and exposes it through context. Key the provider by resource identity, plus
  user or tenant identity where relevant. Selector generation enumerates the initial state, so every declared
  field and action must exist at creation.
- Middleware wraps the state creator; selector hooks wrap the finished store. The generator's return type
  forgets middleware extensions — recover them by merging, never by assertion (assertions are lint-banned):

  ```ts
  const baseStore = createFeatureStore(initial)
  return Object.assign(baseStore, createSelectorHooks(baseStore))
  ```

- Raw store APIs belong to providers, lifecycle hooks, tests, imperative integrations, and event-time snapshots
  in handlers — never render-time reads.

Files: `lib/store/<feature>-store.ts` (factory), optional `<feature>-store-selectors.ts` and
`<feature>-storage.ts` beside it, and `contexts/<feature>-context.tsx` (provider and hooks). Use the `new-store`
workflow to add one.

## Selectors and hooks

- Generated hooks are canonical for atomic fields and actions. The context binds focused feature hooks
  (`useFeatureTitle = () => useFeatureStore().useTitle()`); do not hand-write `(state) => state.title`.
- Parameterized, composite, and derived selector hooks live in `lib/store/<feature>-store-selectors.ts`. They
  take the provider-owned store, and the context binds them so components never touch Zustand. Keep pure
  domain derivation outside React and call it from the selector hook.
- A composite must be one semantic value or operation. Recognizer: if you cannot name it without "and", it is
  a bag — a `useActions()` returning every action, or a `useEditorFields()` returning title and content, are
  bags. Use `useShallow` only when a selector genuinely assembles a new object or array whose shallow contents
  define equality.
- Keep render subscriptions and imperative access visibly separate: focused hooks read render state;
  `use<Feature>Api` is for lifecycle hooks, subscriptions, event-time snapshots, and tests.
- Zustand v5 requires stable selector outputs. Never return a fresh object or array without a deliberate
  equality strategy, and never hide an unstable selector behind a convenience hook. React Compiler optimizes
  renders; it does not change `useSyncExternalStore` snapshot equality.

## Canonical and derived state

Store canonical editable data and derive views from it. Apply business mutations through pure operations in
`packages/shared/src/domain/` so stores, server code, and tests share the same invariants.

## Middleware

Each middleware earns its place. When persistence, undo/redo, and subscriptions are all required:

```ts
persist(temporal(subscribeWithSelector(stateCreator), temporalOptions), persistOptions)
```

`persist` for durable drafts · `temporal` for undo/redo · `subscribeWithSelector` for imperative bridges such
as autosave. Add `immer` only for genuinely nested state (flat objects use plain `set`), and `devtools` only
when an action log is the practical way to debug. Whoever subscribes owns unsubscribe plus throttle/debounce
cancellation.

## Undo and redo

- `partialize` includes only undoable canonical content — never selection, hover, open panels, request flags,
  errors, server timestamps, derived data, or functions.
- Mutations are small deterministic action boundaries. Group history recording (throttle zundo's `handleSet`)
  so a long gesture cannot produce hundreds of steps, and set a history limit matched to payload size.
- Pause history for hydration, server replacement, and non-undoable imports; resume afterward.
- Expose reactive `useCanUndo`/`useCanRedo` and imperative commands from the context module.
- Controlled fields lose native undo, so the editor binds undo/redo shortcuts on its own fields. Ignore IME
  composition and blocked modal contexts.
- Autosave does not erase history; an explicit reload or replace normally does. Document exceptions.

## Draft persistence

- A custom `PersistStorage` validates envelope and state with Zod before merge, discarding malformed,
  tampered, or unknown-future drafts without breaking store initialization.
- Persist only the minimum route-scoped draft — no secrets, Query cache, server responses, derived or transient
  UI state.
- Keys carry user/tenant and resource identity where applicable. The validated envelope always carries an
  integer schema version. Keep the key stable when old data must be detected, migrated, or removed; version the
  key only for a deliberate hard cutover with an old-key cleanup policy.
- Define `partialize`, an integer `version`, either tested forward migrations or an explicit fail-closed discard
  policy, a deliberate `merge`, and SSR hydration behavior. Use `skipHydration` only when identity or
  browser-only storage must resolve after SSR. On a client-only route (`ssr: false`) the draft hydrates
  synchronously inside the factory, so the first paint already has it and nothing gates on hydration.
- Validation and merge identity are separate concerns: where reference stability matters, validate without
  replacing unchanged branches with a deep-cloned parse result.
- Gate writes on unsaved changes derived against a clean checkpoint — never a stored dirty flag. A successful
  save advances the checkpoint; clear storage once the working state is clean.

### Identity-scoped drafts

- Decide guest, user, and tenant ownership before hydration. A guest draft may stay anonymous until an
  authenticated identity explicitly adopts it.
- Never hydrate one identity's draft for another. Clear or quarantine mismatches before the store reads
  browser storage.
- Define sign-out and session-expiry behavior explicitly: do not silently discard recoverable work, and do not
  retain data after an intentional identity change.

## Autosave

- The autosave lifecycle hook lives in `lib/hooks/use-<domain>-mutations.ts` (React Query hooks are
  lint-banned elsewhere) and reads the store through `use<Feature>Api`.
- Serialize writes within one editor client — a slower earlier request must never overwrite a newer local edit.
  A Query mutation scope is client-local, not cross-tab or cross-device conflict detection; use a server-checked
  revision only when the product requires that stronger guarantee.
- The debounce only schedules saves; serialization is what guarantees ordering. A manual save, if offered,
  cancels the pending debounce, joins the queue, and awaits the latest result.
- Read the snapshot when the save is enqueued after the debounce, not when the debounce was scheduled.
- Use the inferred server-function result directly. Advance the clean checkpoint, update the detail query, and
  invalidate affected lists through the domain key factory in `lib/queries/`.
- Failures keep the draft and dirty state; retry UI stays at the call site.
- Cleanup on unmount is explicit — decide flush vs. cancel from navigation semantics, and test it.

## Required tests

- Every store: factory actions and pure operations without React; provider isolation and missing-provider
  errors; generated atomic hooks re-render only for their selected field.
- Custom or composite selectors: stability and reactivity.
- Identity-scoped stores: provider identity switching.
- Undo/redo: inclusion, exclusion, limits, pause/resume, clean-checkpoint behavior.
- Persisted stores: corrupt and future data, every migration or discard policy, custom merge, SSR hydration,
  identity-scoped keys.
- Subscriptions or autosave: cleanup, timer behavior, serialized-write races.

Refs: `apps/web/src/contexts/` · `apps/web/src/lib/store/` · `apps/web/src/lib/hooks/`.
