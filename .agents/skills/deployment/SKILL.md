---
name: deployment
description: Change CI jobs, Docker images, Railway deployment, release workflows, or pre-deploy migrations. Use before editing .github/workflows/**, Dockerfile.web, Railway configuration, deployment scripts, or release procedures.
user-invocable: false
---

# Deployment and operations

## Safety gate

Implementation, review, and runbook work is local by default. Do not deploy, migrate a shared database, rotate
credentials, or change a live Railway environment unless the user explicitly requests that action and the exact
project, service, environment, and ref are confirmed. Production is always a separate reviewed action.

## CI

- `ci.yml` runs `pnpm check-all`, Drizzle and `openapi.json` drift checks, migrations and seed against a
  Postgres 18 service, tests, and the production build. Pull requests must pass it before merge; `release.yml`
  refuses to deploy a SHA without a successful CI run.
- Pin third-party actions to reviewed commit SHAs and grant minimal permissions.
- Never cache secrets or the generated outputs that drift checks compare.

## Container

- `node:24-bookworm-slim` (major version only, not a digest), manifest-first dependency layer, dev
  dependencies at build and production dependencies at runtime, non-root user. No `.env` or secrets in layers.
- `/api/health` checks the database and returns 200/503 without exposing internal detail. The deploy script
  records the deployed commit as the `APP_VERSION` build variable, and health reports it.

## Environments

- Local, staging, and production use separate databases, auth secrets, OAuth clients, email keys, and analytics
  keys.
- Production requires explicit HTTP(S) origins: `VITE_SITE_ORIGIN` at build time, `BETTER_AUTH_URL` at startup.
- Releases are manual `workflow_dispatch` runs, serialized per environment; production promotion is an explicit
  reviewed action.

## Database changes

- `railway-deploy.sh` applies reviewed SQL migrations (`pnpm db:migrate:deploy`) before `railway up`, so a
  failure stops the release. `railway.web.json` has no `preDeployCommand`: leave Railway's GitHub auto-deploy
  off, or those deploys skip migrations.
- Application-data backfills are separate controlled operations, never hidden in startup, and run sequentially
  by default so load and failure analysis stay simple. Release ordering lives in the `database` skill.

## Railway wiring

- `railway.web.json` is the web service's config-as-code: `Dockerfile.web` builder, `/api/health` health check,
  restart policy. Railway does not discover non-default filenames — set the service's config-as-code path to it
  in the service settings, once per environment.
- `release.yml` is environment-parameterized: dispatch chooses a GitHub environment (production requires main,
  staging deploys any ref), and that environment supplies everything — `RAILWAY_TOKEN` as a secret plus
  `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT`, `RAILWAY_SERVICE`, and optional `PUBLIC_ORIGIN` as variables.
  Nothing deploy-target-specific belongs in the workflow or the script.
- The deploy script passes project, environment, and service to every CLI call explicitly, so a token scoped to
  the wrong target fails instead of deploying somewhere implicit. The CLI version is pinned; override with
  `RAILWAY_CLI_VERSION`.
- The workflow installs the workspace with `--ignore-scripts` because `railway run … pnpm db:migrate:deploy`
  executes locally with injected service variables. When `PUBLIC_ORIGIN` is set, the release gates on
  `/api/health` reporting `status: ok`.

## Before the first shared environment

When the first staging or production environment is being set up, follow
[first-shared-environment.md](first-shared-environment.md).

Refs: `.github/workflows/` · `.github/scripts/railway-deploy.sh` · `Dockerfile.web` · `railway.web.json`.
