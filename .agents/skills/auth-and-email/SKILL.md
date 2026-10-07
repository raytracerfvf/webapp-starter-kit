---
name: auth-and-email
description: Configure and review Better Auth, OAuth providers, magic links, sessions, credentials, and transactional email with React Email, Resend, and EMAIL_MODE. Use before changing apps/web/src/lib/auth/**, apps/web/src/lib/email/**, or authentication and email environment variables.
user-invocable: false
---

# Authentication and email

## Architecture

- Better Auth owns sessions, accounts, verification, and provider callbacks; Drizzle and PostgreSQL own durable
  auth data through the generated schema; server functions and operations own authorization.
- React Query owns client session and user reads where caching helps. Successful sign-out and confirmed session
  loss clear the Query cache, then invalidate the router so root auth context is rebuilt: the sign-out mutation
  hook does it for sign-out, the `MutationCache` 401 handler in `router.tsx` for session loss. Impersonation
  start/stop instead does a full page load. Components own navigation and other UI effects.
- React Email renders templates; `apps/web/src/lib/email/mailer.server.ts` selects log, provider, or disabled
  mode.

## Generated schema

Generate Better Auth's Drizzle schema (`packages/shared/src/db/schema/auth.gen.ts`) with the `auth` CLI at the
`better-auth` version pinned in `apps/web/package.json`, and never hand-edit it
*(enforced: write-guard hook)*. The CLI cannot load the runtime config, so it reads
`apps/web/auth-cli.config.ts` — keep that mirror's plugins and schema-affecting options in sync with
`auth.server.ts`. Generate and review a Drizzle migration after each regeneration.

```bash
pnpm dotenv -e .env -- pnpm dlx auth@<pinned version> generate \
  --config apps/web/auth-cli.config.ts --output packages/shared/src/db/schema/auth.gen.ts --yes
```

Extend application-owned profile and preference data in separate tables.

The CLI emits naive `timestamp` columns — a deliberate trade, since keeping the file regenerable beats forking
it for `timestamptz`, and app and DB both run UTC. Application-owned tables use `timestamptz`.

## Roles and admin access

- Roles are comma-separated text on `user.role`. The role model lives in
  `packages/shared/src/domain/admin/types.ts`: read through `hasRole`/`hasAdminRole`, write through
  `normalizeRoles`/`serializeRoles`, and pass `defaultRole`/`adminRoles` to `admin()` from the same constants.
- `requireAdminMiddleware` guards admin-only server functions; the `/admin` route redirect is UX only.
- App-defined admin server functions are read-only. Role, ban, and impersonation writes call Better Auth's
  own `/api/auth` admin endpoints. `hooks.before` in `auth.server.ts` applies `lib/auth/admin-write-policy.ts`
  to `/admin/set-role` and `/admin/ban-user` only; unban and impersonation rely on the plugin's own checks.
  Disabled UI controls mirror the policy but are not the enforcement.
- Other plugin admin endpoints (`update-user`, which also accepts `role`, `create-user`, `remove-user`,
  `set-user-password`) bypass the policy; guard or disable any that can perform a policed write.
- Blocking is the plugin's ban: it revokes sessions and blocks every sign-in method until lifted. Role and
  ban revocations lag already-issued cookies by up to the 5-minute cookie cache.
- Bootstrap or recover an admin with `pnpm admin:promote <email>` after the target signs in once; the local
  seed user is an admin already.

## Security invariants

- Rate limits use database storage so they hold across instances. Magic-link sign-in is 3/60s — relevant when
  testing sign-in repeatedly.
- Do not enable account linking without provider-verified identity and an explicit trusted-provider list.
- `POST /api/internal/auth-cleanup` requires `AUTH_CLEANUP_SECRET` in `x-cleanup-secret`, compared in constant
  time. Internal endpoints are never called from client code.

## OAuth providers

Google uses `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, GitHub uses `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`.
A provider is disabled when both values are absent, and startup fails when only one of a pair is present.
Callback URLs are `<BETTER_AUTH_URL>/api/auth/callback/{google,github}`.

`BETTER_AUTH_URL` equals the public origin exactly, including scheme and port. Use a separate OAuth application
per environment.

## Email boundary

Three explicit modes: `log` (local delivery sink), `resend` (deployed delivery, requires `RESEND_API_KEY`), and
`disabled` (intentional no-send with a clear operational log).

- `log` writes a credential-bearing sign-in link to the request logger. Treat it as a credential: keep it out
  of shared and production logging.
- Render HTML and text from the same typed template props.
- The mailer validates every link against `BETTER_AUTH_URL` before placing it in email; keep that check.
- The sender is hardcoded in `mailer.server.ts` to Resend's onboarding address — replace it with an
  environment-specific sender and verified domain (SPF, DKIM, DMARC) before production sending.

## Live credentials

Keep code and configuration work local. Before creating, rotating, or revoking deployed credentials, or sending
live email, confirm the provider account, environment, and target address with the user. Staging and
production keys never go in the repository `.env`.

## Required checks

- Magic-link issue, expiry, reuse rejection, sign-in, and sign-out.
- Sign-out clears cached server data, awaits router auth-context rebuilding, and preserves the cache on failure.
- Correct origins and callbacks for the environment.
- Unauthorized direct server-function calls fail; cross-user and cross-tenant access fails.
- Provider errors and email failures reveal no secrets or addresses in client messages or log structure.
- HTML and text templates render. Verify live delivery with a designated test address only when explicitly
  authorized.

Refs: `apps/web/src/lib/auth/` · `apps/web/src/lib/email/`.
