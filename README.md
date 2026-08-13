# Webapp Starter Kit

**A supposedly simple starter for apps that never stay simple.**

Inspired by the architecture that powers [zenrockets.com](https://zenrockets.com).

The thing nobody tells you about web applications, back when everything is still greenfield and pure
possibility, is that every single one of them eventually has to decide who owns which piece of state, who is
allowed to talk to the database, and what happens to the data when the schema changes; and that you will make
these decisions either now, calmly, with tests, or later, at approximately 2 a.m., without them. This starter
makes them now.

An opinionated TanStack Start starter with enforced boundaries, typed data access, authentication, state
ownership, database evolution, CI, and Railway deployment, designed for AI-assisted development.

Agent guidance lives with the code: [AGENTS.md](./AGENTS.md) defines repository-wide rules, while focused
[skills](./.agents/skills/) explain how to work safely in each architectural area and provide repeatable
workflows for changes such as adding a domain or a store. Lint rules, build checks, and write guards enforce
the same contracts for agent- and human-written code.

An included reference feature demonstrates these patterns end to end.

## How it is opinionated

Types run from the database schema to the UI, and untrusted values are parsed once where they enter.
Dependencies point one way: components use hooks, hooks use query modules, query modules call server
functions, and only server code touches the database. Every server function validates its own input and
checks its own authorization, because route redirects are not access control. Each kind of state has one
owner. Schemas change through reviewed migrations. Lint rules and build checks enforce all of it, so nobody
has to remember it.

## What's included

- **Runtime** — SSR, file routing, loader prefetching, Query hydration, and route-level loading, error, and
  not-found states
- **Auth and email** — Better Auth magic links, PostgreSQL sessions, rate limits, optional Google and GitHub
  OAuth, React Email templates, local log delivery, optional Resend
- **Data** — Drizzle schemas and generated migrations, framework-free domain operations, versioned JSONB,
  resumable backfills
- **State** — shared Query definitions for loaders and components, centralized mutation and cache handling,
  React Hook Form, router-owned URL state, scoped Zustand stores with optional persistence and undo/redo
- **UI** — Tailwind design tokens, system-aware dark mode, Radix/shadcn-derived primitives, accessible forms
  and status states, reduced-motion behavior
- **Localization** — English and German localized URLs, request-scoped SSR locale handling, translated UI and
  email copy, typed MDX collections
- **Security and observability** — CSRF protection, security headers, environment validation, safe client
  errors, structured Pino logs with correlation IDs and redaction, a database-aware health endpoint
- **SEO and analytics** — localized sitemap and robots routes, no-index defaults outside production, optional
  PostHog page views
- **Quality** — Vitest, PGlite, pytest, coverage, bundle analysis, React Compiler diagnostics, migration and
  OpenAPI drift checks
- **Delivery** — GitHub Actions CI, a multi-stage non-root container, precompressed assets, health checks,
  graceful shutdown, migration-first Railway releases
- **AI-ready** — repository-wide agent guidance, area skills, runbooks for adding a domain or store, and
  generated-file write guards
- **Optional Python service** — FastAPI behind HMAC-authenticated requests with replay protection, a
  generated TypeScript client, and an end-to-end example route

## Stack

TanStack Start and Router · React · TanStack Query · Better Auth · Drizzle · PostgreSQL · Zod · Zustand ·
React Hook Form · Tailwind · Radix · Paraglide · React Email · Pino · Vitest · pytest · Turborepo ·
optional FastAPI service behind a generated TypeScript client

## Start locally

Requires Node, pnpm, and Docker. Python with [uv](https://docs.astral.sh/uv/) is needed only for the Python
service. Versions are pinned in [`.nvmrc`](./.nvmrc), [`package.json`](./package.json), and
[`apps/api-python/pyproject.toml`](./apps/api-python/pyproject.toml).

```bash
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:migrate
pnpm dev
```

## Development

`pnpm check-all && pnpm test` is the completion gate. Other common tasks: `pnpm build`, `pnpm db:generate`,
`pnpm db:migrate`, `pnpm db:seed`, `pnpm codegen`, `pnpm email:dev`, `pnpm analyze`. See
[AGENTS.md](./AGENTS.md) for the full command list and the repository map.

CI runs formatting, architecture linting, type checks, tests, production builds, and generated-artifact drift
checks on pull requests and `main`.

## Deployment

Railway is the included production path: version-controlled configuration, a non-root Docker image, health
checks, and graceful shutdown. Releases deploy an exact CI-approved commit and run migrations first. The
Python service has no Railway definition — deploy it separately or remove its integration points.

## License

[MIT](./LICENSE)
