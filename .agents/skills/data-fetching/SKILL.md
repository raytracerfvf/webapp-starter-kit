---
name: data-fetching
description: Implement and review server functions, query keys and options, query and mutation hooks, loader prefetching, cache consistency, and autosave writes. Use before changing apps/web/src/server/**, apps/web/src/lib/queries/**, or apps/web/src/lib/hooks/**.
user-invocable: false
---

# Server functions and data fetching

## Server functions

Keep them in `apps/web/src/server/`, one module per domain, with strict input/output serialization enabled.

Handler order: resolve authentication, tenant, and resource access → acquire the executor or transaction →
call shared operations → map domain errors to safe HTTP errors → log only what global middleware cannot
observe. Handlers hold no reusable business transformations, no UI wording branches, and no validation
duplicated from shared schemas.

Validate output in the handler only when it originates from an untrusted source, restricts exposed fields, or
enforces a stable external contract. Ordinary internal typed results need no client-side parse.

### Middleware

- Per-function middleware: authentication, authorization context, explicit feature policy. Nothing else.
- Global request middleware: request context, correlation, CSRF, logging, response headers.
- Global function middleware: logging and sanitizing server-function throws before the framework serializes
  them — ordinary request error middleware never sees them.
- Correlation ID, request logger, and authenticated user ID travel through AsyncLocalStorage request context,
  not through every domain-operation parameter.

### Authorization

A session gives you a user, not permission. Recognizer: **if the query carries no ownership predicate, it is
not authorized** — the check belongs in the WHERE clause, not in a `beforeLoad`.

- Never accept an owner, user, or tenant ID from input without matching it against authenticated context.
- Authorize and mutate in one transaction when a race could invalidate the decision.

### Error policy

Two channels, and choosing the wrong one is the common mistake:

- **Return as data** — expected domain outcomes the UI must branch on, in a `{ data, error: code }` envelope.
- **Throw** — auth, validation, missing resource, infrastructure. Throws drive boundaries and retry policy,
  not outcomes the UI renders differently.

- Throw via the helpers in `lib/errors.server.ts` (`throwNotFound`, `throwUnauthorized`, `throwForbidden`);
  add a small named helper in that shape for a new status. Helpers log their `meta` bag server-side (domain IDs
  and counts only); the wire carries just message, status, and code.
- Hand-thrown 400s are rare — validation belongs to `.validator(...)`, whose `ZodError` the sanitizer
  collapses to `400 VALIDATION_ERROR`.
- When client copy must vary by failure kind, transport a stable machine `code`: declare a `z.enum` of codes in
  `packages/shared/src/domain`, decode transported errors with a `safeParse` helper shaped like
  `decodeHttpError` in `lib/errors.ts`, and map codes to localized copy via `Record<Code, () => string>` at the
  call site.
- Server messages never render in production UI. Unexpected errors become a generic client message with the
  exception and correlation ID preserved in logs. Never return upstream text, stacks, internal hosts, SQL,
  library names, or another user's identifiers.

## Hook placement

One home per hook kind. Biome enforces every row:

| Hook kind | Lives in | Components |
|---|---|---|
| Keys, `queryOptions`, fn wrappers, mutation fns | `lib/queries/<domain>.ts` — the only importer of `@/server/**` | never import it |
| Read hooks | `lib/hooks/use-<domain>-queries.ts` | call the named hook |
| Write hooks, including autosave-style lifecycle writes | `lib/hooks/use-<domain>-mutations.ts` | call the named hook, never `useMutation` |
| Store access | `contexts/` hooks | call the context hooks |

Auth actions are writes too: `@/lib/auth/client` is importable only from `lib/auth/**` and `lib/hooks/**`, so
sign-in and sign-out flow through `lib/hooks/use-auth-mutations.ts`.

## Reads

- Route loaders for page-critical data and provider initialization. Query for reads that are reused,
  refreshed, mutated, paginated, or consumed in several places. Never fetch component data in `useEffect`.
- The loader calls `await context.queryClient.ensureQueryData(options)` and returns no duplicate copy; the
  component calls the domain read hook wrapping the same options with `useSuspenseQuery`.
- Non-suspense `useQuery` is legitimate only inside a named domain read hook, when the absence of SSR data is
  deliberate. Use `skipToken` when the identifier does not exist yet.
- Prefer summaries for list views and full payloads only for detail and editing views.

## Query keys

- Hierarchy: `all` → `lists()` → `list(normalizedInput)` and `details()` → `detail(id)`.
- Normalize optional and defaulted input inside the factory so loaders and read hooks produce identical keys.
- Include every changing query-function dependency.
- Keys stay serializable and use branded domain IDs rather than whole objects.
- Never invalidate with an inline string or array literal — always a key-factory prefix.

## Router and Query

- Root router setup owns one QueryClient and the Start SSR integration.
- Retry is status-aware (`shouldRetryQuery` in `lib/errors.ts`): expected 4xx fails straight to its boundary,
  only network failures and 5xx retry, and SSR never retries. Do not restore a blanket `retry` number.
- Prefer query-prefix invalidation. Use `router.invalidate()` only when active route loaders outside Query
  genuinely need to rerun.
- Sign-out and confirmed session loss are the deliberate broad-reset exception: clear the Query cache, then
  invalidate the router so no previous identity's server data or route context survives.

## Mutations

- One `useXxxMutation` per user action, one flat file per domain — organized by domain, never by mechanism.
- Call `mutate` or `mutateAsync` directly in the click, submit, or other user-event handler.
- A redirect destroys the handler mid-action (saving a guest draft that needs sign-in first). Persist the
  intent in a search param and resume it from one lifecycle hook that latches against re-entry; the caller
  clears the intent and navigates.
- Mutation hooks own required cache writes and invalidation in `onSuccess`, and return or await invalidation
  promises so `mutateAsync` stays pending until consistency completes.
- Update exact detail data when the mutation returns the canonical updated record; invalidate broader lists and
  summaries whose membership or ordering may have changed.
- UI effects — navigation, toast, closing a modal, clearing local UI, focus — stay at the component call site.
- The global `staleTime` is 5 minutes, so remount and navigation legitimately reuse cached data. Every mutation
  names its cache-consistency work; "navigation will refetch" is not a correctness strategy.

## Direct calls and boundary parsing

Some reads legitimately bypass the Query cache: loader-only reads backed by the router cache, commands
returning a URL or another non-cached result, and one-shot reads not worth caching. They still go through
`lib/queries/<domain>.ts` — loaders may call it directly, UI-triggered calls go through a named hook in
`lib/hooks/**`. When a matching query exists, prefer `queryClient.fetchQuery`.

Writes always run as mutations, including lifecycle writes like autosave, so `MutationCache.onError` sees them
(401 → session invalidation in `router.tsx`). Autosave is a mutation with a subscription attached: its domain
lifecycle hook owns the mutation, uses `scope` to serialize overlapping saves, and `onSuccess` for consistency.

Parse unchecked external HTTP or SDK responses inside the query function or its source adapter, before they
reach components or stores; never assert an external response directly to a domain type. Shared Zod schemas own
dates, IDs, enums, versioned JSON, nullable fields, and external payload normalization. Internal
`createServerFn` results rely on their inferred return type — do not re-parse them merely because they crossed
the transport.

## Required tests

- Validator accepts and rejects correctly, and preserves inferred input types.
- Anonymous, wrong-tenant, wrong-owner, and insufficient-role calls fail safely; direct calls receive the same
  protection as route-driven calls.
- Expected and unexpected errors expose only allowed fields and messages; transaction rollback covers
  multi-step operations.
- Key normalization and prefix relationships; the loader and the domain read hook use the same options and key.
- External boundary parsers reject malformed and future-version payloads.
- Every mutation invalidates or updates all affected keys and awaits required invalidation.
- Autosave serializes overlapping writes and preserves the latest state.

Refs: `apps/web/src/server/` · `apps/web/src/lib/queries/` · `apps/web/src/lib/hooks/` ·
`apps/web/src/lib/middleware/`.
