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
  loss clear the Query cache, then invalidate the router so root auth context is rebuilt — mutation hooks own
  that consistency work, components own navigation and other UI effects.
- React Email renders templates; `apps/web/src/lib/email/mailer.server.ts` selects log, provider, or disabled
  mode.

## Generated schema

Generate Better Auth's Drizzle schema (`packages/shared/src/db/schema/auth.gen.ts`) with the pinned CLI version
and never hand-edit it *(enforced: write-guard hook)*. Extend application-owned profile and preference data in
separate tables. Generate and review a Drizzle migration after each regeneration.

The CLI emits naive `timestamp` columns — a deliberate trade, since keeping the file regenerable beats forking
it for `timestamptz`, and app and DB both run UTC. Application-owned tables use `timestamptz`.

## Security invariants

- A session establishes identity, not authorization. Check ownership, tenant membership, role, visibility, and
  resource status where the data is accessed, in server-function middleware or operations — never only in a
  route redirect.
- Session cookies are secure in production and configured for the exact trusted origin.
- Rate-limit magic-link and social-auth endpoints with durable shared storage in deployed environments
  (database-backed here). Magic-link sign-in is 3/60s — relevant when testing sign-in repeatedly.
- Account linking requires provider-verified identity and a deliberate trusted-provider policy.
- Auth cleanup and internal endpoints use constant-time secret comparison and are never reachable from client
  code.

## OAuth providers

Google uses `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, GitHub uses `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`.
A provider is disabled when both values are absent, and startup fails when only one of a pair is present.
Callback URLs are `<BETTER_AUTH_URL>/api/auth/callback/{google,github}`.

`BETTER_AUTH_URL` equals the public origin exactly, including scheme and port, and is required explicitly in
production rather than defaulting to localhost. Never use wildcard redirects. Providers that allow only one
callback need one application per environment, and production OAuth clients stay isolated from non-production.

## Email boundary

Three explicit modes: `log` (local delivery sink), `resend` (deployed delivery, requires `RESEND_API_KEY`), and
`disabled` (intentional no-send with a clear operational log).

- `log` writes a credential-bearing sign-in link to the request logger. Treat it as a credential: keep it out
  of shared and production logging.
- Render HTML and text from the same typed template props.
- Validate every callback and redirect URL against trusted origins before placing it in email — the mailer
  checks against `BETTER_AUTH_URL`.
- Keep tracking and webhooks disabled unless the product needs them and the privacy design is done.
- Use an environment-specific sender, domain, and key, and a staging subject prefix where helpful.

## Local setup

The app must boot and support log-mode magic links with only `DATABASE_URL` and `BETTER_AUTH_SECRET`. Social
providers activate only with a complete, valid credential pair.

## Before deployed credentials exist

Keep code and configuration work local. Before creating, rotating, or revoking deployed credentials, or sending
live email, confirm the provider account, environment, and target address with the user. Use a distinct Better
Auth secret per environment, never prefix a secret with `VITE_`, and never put staging or production provider
keys in the repository `.env`. Configure and verify SPF, DKIM, and DMARC before production sending.

## Required checks

- Magic-link issue, expiry, reuse rejection, sign-in, and sign-out.
- Sign-out clears cached server data, awaits router auth-context rebuilding, and preserves the cache on failure.
- Correct origins and callbacks for the environment.
- Unauthorized direct server-function calls fail; cross-user and cross-tenant access fails.
- Provider errors and email failures reveal no secrets or addresses in client messages or log structure.
- HTML and text templates render. Verify live delivery with a designated test address only when explicitly
  authorized.

Refs: `apps/web/src/lib/auth/` · `apps/web/src/lib/email/`.
