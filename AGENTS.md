# AGENTS.md

This is the canonical project guide for coding agents and contributors. It carries only what applies to every
session: commands, environment, the repository map, and hard invariants. Domain-deep guidance lives in the
skills under `.agents/skills/` (see Documentation below).

## Current status

The scaffold is implemented. Evolve it vertically by feature and update this guide when a deliberate
architecture decision changes. Do not silently replace established patterns with framework defaults or
remembered APIs; verify current framework documentation when an API is unstable.

## Commands

These commands are authoritative:

```bash
pnpm dev              # web only            pnpm dev:all      # web + Python service
pnpm build            pnpm start            pnpm analyze

pnpm lint             pnpm lint:react       pnpm format
pnpm typecheck        pnpm test             pnpm test:coverage
pnpm check-all        # biome format + lint (incl. lint:react) + typecheck — no tests

pnpm db:generate      pnpm db:migrate       pnpm db:migrate:deploy
pnpm db:push          pnpm db:reset         pnpm db:seed          pnpm db:studio

pnpm codegen          # Node-only: paraglide, content, TS client from committed openapi.json
pnpm codegen:api-client  # uv: regenerate openapi.json from FastAPI, then the TS client
pnpm docker:up        pnpm docker:down      pnpm email:dev
```

The Python service defines the same task names (`lint`, `format`, `typecheck`, `test`) wrapping uv, so `turbo
run` covers it; there are no separate `py:*` commands. Removing the Python service means deleting its two packages,
the web integration route and adapter, the web dependency and environment keys, and service-only automation
such as the CI Python job; regenerate the route tree and lockfile afterward. Turbo tasks and Docker manifest
copying adapt to the remaining workspaces by presence.

Prefer a filtered or single-file test while iterating, then the affected workspace's typecheck and tests.
The completion gate for a cross-cutting change is `pnpm check-all && pnpm test`.

## Environment

Local boot needs exactly two variables; everything else degrades to a safe default. `pnpm docker:up` provides
Postgres 18 for `DATABASE_URL`; `BETTER_AUTH_SECRET` is distinct per environment and never `VITE_`-prefixed.
Deployed environments additionally require `BETTER_AUTH_URL` and `VITE_SITE_ORIGIN` (exact public origins).
Optional: `EMAIL_MODE` (`log` default — prints the magic link), OAuth pairs (`GOOGLE_*`/`GITHUB_*`, a provider
activates only with the full pair), `PYTHON_SERVICE_URL`/`PYTHON_SERVICE_SIGNING_SECRET` (enables `/api/python-service-demo`; the
secret has a local default that production refuses), `VITE_POSTHOG_KEY`, `VITE_SEO_INDEXABLE`.

Everything reads the single root `.env`: the web dev server through `dotenv -e ../../.env --`, the production
start script through `--env-file-if-exists`, Drizzle Kit through `scripts/with-env.mjs`, and seeds, migrations,
and backfills through `--env-file-if-exists`. The env schemas
in `lib/env/` reject invalid configuration at startup rather than degrading.

Toolchain: Node `24.19.0` · pnpm `11.20.0` · Postgres `18` · TypeScript `7.0.2` · Python `3.13`. pnpm fails
installs on unapproved build scripts — review, then add the package to `allowBuilds` in `pnpm-workspace.yaml`.

## Stack

TanStack Start/Router + React 19 (React Compiler) · TanStack Query · Zustand · Zod 4 · React Hook Form ·
Better Auth · Drizzle + PostgreSQL · Tailwind v4 + shadcn/Radix · Paraglide + content-collections · Pino ·
PostHog · React Email/Resend · pnpm workspaces + Turborepo · optional FastAPI service with generated TS client.

## Repository map

```text
apps/web/src/
  routes/         TanStack file routes and route boundaries
  server/         createServerFn modules, one per domain
  contexts/       scoped providers and public store hooks
  components/     ui, layout, router, auth, notes (feature dirs)
  lib/
    queries/      domain API modules — the ONLY importers of @/server/**
    hooks/        domain read/mutation hooks — the sanctioned React wrapper layer over lib/queries and
                  stores; the only production modules that call React Query hooks (enforced: Biome)
    store/        vanilla Zustand store factories and Zod-validated persistence
    constants/    search-param schemas and other eagerly imported route options
    utils/        pure helpers with no component or context imports
    middleware/   request/function middleware and request context
    auth/         auth client, session, and function middleware
    env/          server.ts and client.ts environment schemas
    email/        mailer boundary, React Email components and templates
    seo/          metadata, robots, sitemap helpers
    content/      localized content loading
    db.server.ts  errors.server.ts  ui-styles.ts
  router.tsx  start.ts  styles.css

packages/shared/src/
  domain/         API input schemas, executor-parameterized operations, domain types derived from decode
  db/schema/      Drizzle tables (root of the type graph), stored JSONB contracts, drizzle-zod row schemas,
                  enums, relations, generated auth schema
  db/             database client and transaction-capable query utilities
```

## Code conventions

- Biome formats/lints JS/TS: double quotes, no semicolons, two spaces. Kebab-case filenames except
  framework-defined names (`__root.tsx`, `$param.tsx`).
- Never edit generated files — `*.gen.ts`, Drizzle migrations/snapshots, generated clients, paraglide,
  content-collections, `openapi.json`, `pnpm-lock.yaml` *(enforced: a PreToolUse hook blocks writes; change
  the source and regenerate with the documented command)*.
- Avoid barrels; exactly four are allowed *(enforced: Biome, exemption list in biome.json)*.
- Comments explain non-obvious constraints, security decisions, or lifecycle behavior — not what the code says.
- Business and storage bounds are named constants beside their owning schema. Reuse the same constant in DDL,
  Zod schemas, browser-storage schemas, and native input attributes; do not duplicate magic numbers or reach
  into a generated schema's `.shape` to recover a bound.
- UI code consumes semantic tokens and owned primitives. Vendor brand artwork may keep mandated colors inside
  its asset or component.
- Do not weaken strict TypeScript settings. Type assertions are banned outside tests, excepting
  `as const` and the honest `as unknown` upcast *(enforced: Biome plugin
  `biome-plugins/no-type-assertion.grit`)*. Never structurally sniff an unknown value
  (`typeof x === "object"`, `"key" in x`) or cast it — decode it once with a Zod schema where it
  enters the trusted model (see `lib/errors.ts` for the transported-error example), then use the
  typed result.

## Boundary and security invariants

- A `createServerFn` is a directly callable RPC security boundary. Authenticate and authorize (including
  resource ownership) inside function middleware/handlers; route `beforeLoad` redirects are UX, not
  protection. Validate every input with `.validator(...)`.
- `lib/queries/` is the only importer of `@/server/**` *(enforced: Biome noRestrictedImports)*.
- UI never imports DB clients *(enforced: Biome — `@repo/shared/db` allowed only in `*.server.ts` and
  `routes/api/**`)*.
- `packages/shared` stays framework-free: no React, TanStack, Pino, app code *(enforced: Biome)*, and no
  request context, environment, or global database access. Domain operations take a `DrizzleExecutor` as
  their first argument.
- Components access stores only through hooks from `contexts/` *(enforced: Biome bans `zustand` and
  `@/lib/store/**` in `components/**`)*.
- UI data access goes through named application hooks: production React Query hooks may be called only inside
  `lib/hooks/**`, and components may not import `lib/queries/**` directly. The auth client is importable only
  from `lib/auth/**` and `lib/hooks/**` *(enforced: Biome `importNamePattern` and path bans everywhere else in
  `apps/web/src`)*.
- Route options other than `component` are eagerly imported and ship in the entry bundle. Loaders, search
  schemas, `beforeLoad`, and `head` may import only lightweight `lib/**` modules *(not machine-enforced —
  review import reachability manually; `component`-only imports are fine, the splitter removes them)*.
- `src/start.ts` must explicitly install CSRF protection; a custom start instance disables the framework
  default. TanStack loaders are isomorphic — secrets and privileged calls stay in server functions or
  `.server.ts` modules guarded by `@tanstack/react-start/server-only` *(enforced at build time)*.
- Parse unknown or untrusted values once, where they first enter the trusted model (server-function inputs,
  JSONB, browser storage, environment, external APIs). Do not re-parse internal typed server-function results
  after transport.
- Construct narrower access views field-by-field. Never remove fields from a wider object to make a public or
  lower-privilege projection; omission is a deny-list that leaks newly added fields by default.
- One enum source: const tuple → `z.enum` → inferred type → derived `pgEnum`, plus a named accessor object
  (`NoteVisibility.PRIVATE`, `AccessLevel.OWNER`). Compare via accessors, never bare string literals. Never
  TypeScript `enum` *(enforced: Biome)*.
- Never expose server secrets through `VITE_*`, return upstream exception text to clients, trust client-sent
  ownership/role fields, or log names, emails, auth payloads, tokens, or secrets.

## State ownership

Choose one owner for each value:

| State kind | Owner |
|---|---|
| Remote records, lists, request status, cache | TanStack Query |
| Shareable filters, tabs, pagination, navigation state | Router search params |
| Ordinary form values, touched/dirty/errors during form interaction | React Hook Form |
| Complex editors, workflows, selections, persisted/undoable working copies | Context-scoped Zustand |
| Small state used by one component | React `useState` |
| Durable authoritative data | PostgreSQL |

Do not mirror Query data into a global client store. A feature-scoped editor may initialize once from typed
loader data and own the working copy until save, reset, or identity change; incoming cache refreshes must not
overwrite an active draft.

When such an editor uses React Hook Form, Zustand remains the sole owner of the working copy. Pass the draft
through RHF's reactive `values` option and write changes to both adapters in the field event; do not add an
Effect that mirrors one state container into the other.

## React invariants

- Render components through JSX; never call component functions as ordinary functions. Keep Hooks at the top
  level and use functional state updaters whenever the next value depends on the previous value.
- `useEffect` drives a system React does not own. The legitimate shapes are enumerable — if yours is not one of
  these, it is a bug: rehydrating a store from browser storage (pause history across it); a timer or listener
  owned by the mounted tree; a store subscription driving autosave; resuming a search-param intent after a
  redirect destroyed the handler (latch against re-entry); resetting a non-React-owned boundary on mount.
- Everything else has a home: derive during render · event or mutation callback · `key` to reset on identity
  change · loader `ensureQueryData` or the store initializer to seed · loader or Query to fetch. Never mirror
  React-owned state, chain state transitions, or suppress `exhaustive-deps`.
- One process per Effect, every reactive dependency, symmetrical cleanup, and tolerate Strict Mode's
  setup → cleanup → setup cycle.
- Rely on React Compiler for routine memoization. Add `useMemo`, `useCallback`, or `memo` only for measured
  expensive work or a required stable reference; preserve existing manual memoization unless testing proves
  it unnecessary.

## Testing

- The completion gate is `pnpm check-all && pnpm test`. Bug fixes add the smallest regression test that would
  have failed before the fix.
- Vitest runs with `isolate: false`, so module state leaks between files. A test that passes alone and fails
  in the suite is an isolation bug — fix it with `vi.resetModules()` or a per-file override, never retries.
- Biome and the `eslint-plugin-react-hooks` pass (React Compiler diagnostics) must both stay green; the Rules
  of React apply.

## Documentation

The area skills in `.agents/skills/` are the architecture contracts. Each loads automatically when work
matches its area (database, data-fetching, state-management, tanstack-start, auth-and-email, logging, design,
testing, deployment, content-i18n, packages) and stays aligned with concrete file references and commands as
the implementation evolves. Workflow skills encode the repeatable sequences — `new-domain` and
`new-store` — and load automatically when the work matches. When a skill triggers,
follow it; human readers can read the same `SKILL.md` files directly before changing a cross-cutting concern.

Skill paths distinguish contracts from examples. Use concrete paths only for durable infrastructure and
enforced boundaries, and placeholders such as `<domain>` or `<feature>` for destinations the workflow creates.
Do not make skills depend on disposable starter features, demo routes, or seeded records; describe the pattern
or inspect the nearest current implementation instead. Update affected skills when an architectural path is
renamed or removed.

Canonical skills may contain optional tool-specific frontmatter. Agents should ignore fields they do not
recognize, and tool-specific metadata must never be the only enforcement for safety-critical behavior.

## Agent workflow

1. Read this guide; let the matching skill load (or read its `SKILL.md` under `.agents/skills/`).
2. Inspect neighboring code and generated boundaries before editing.
3. Make the smallest coherent change; preserve unrelated user work.
4. Update schemas/types/operations before adapters and UI.
5. Regenerate derived artifacts with the documented command; never hand-edit them.
6. Run focused checks while iterating, then `pnpm check-all && pnpm test` for cross-cutting changes.
7. Update the relevant skill and this guide only when an invariant or workflow genuinely changed.

Do not add agent attribution, generated-by footers, or co-author trailers to commits or pull requests.
