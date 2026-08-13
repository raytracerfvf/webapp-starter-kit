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

- `ci.yml` runs formatting and lint, React Compiler lint, TypeScript, tests, codegen drift, Drizzle drift, and
  the production build. Pull requests must pass it before merge; release workflows do not substitute for it.
- Pin third-party actions to reviewed commit SHAs and grant minimal permissions.
- Cache pnpm, Turbo, and uv artifacts. Never cache secrets, or the generated outputs whose drift check is the
  entire point.

## Container

- Pinned Node 24 Debian slim image, manifest-first dependency layer.
- Build with dev dependencies; ship production dependencies plus server and build artifacts.
- Run as a non-root user, expose only the application port, handle SIGTERM gracefully.
- Never bake `.env` files or secrets into layers.
- `/api/health` checks the database and returns 200/503 without exposing internal detail. The deploy script
  records the deployed commit as the `APP_VERSION` build variable, and health reports it.

## Environments

- Local, staging, and production use separate databases, auth secrets, OAuth clients, email keys, and analytics
  keys. Environment schemas validate at startup and report missing vs. invalid variables without printing
  values.
- Production builds require explicit `BETTER_AUTH_URL` and `VITE_SITE_ORIGIN` HTTP(S) origins.
- Staging may follow main automatically; production promotion is an explicit reviewed action.

## Database changes

- Pre-deploy applies reviewed SQL migrations (`pnpm db:migrate:deploy`) and prevents the new app from starting
  on failure.
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
  executes locally with injected service variables. Migrations run before `railway up --ci` ships the new
  build. When `PUBLIC_ORIGIN` is set, the release gates on `/api/health` reporting `status: ok`.

## Before the first shared environment

None of the following applies until one exists. When it does, establish in this order:

1. An environment and callback matrix — exact origins and provider callback URLs, no secret values — plus a
   credential rotation procedure: create the replacement, deploy it, verify the whole flow, then revoke.
2. A smoke-test pass: health and graceful response · correlation and security headers · sign-in and sign-out ·
   one protected read/write plus an authorization rejection · asset compression and cache headers ·
   robots/indexing policy · analytics-disabled behavior with no key · after a schema change, an old-version
   read and a current-version write.
3. Backup ownership with a last-verified date, and the incident correlation-ID lookup path.

Refs: `.github/workflows/` · `.github/scripts/railway-deploy.sh` · `Dockerfile.web` · `railway.web.json`.
