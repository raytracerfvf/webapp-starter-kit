---
name: logging
description: Add or review server-side Pino logging, correlation IDs, request context, redaction, and safe client errors. Use before adding log statements, changing request or function middleware, or changing server-side error handling.
user-invocable: false
---

# Server-side logging

## Request context

- One correlation ID per request, resolved in order: valid trace ID → request ID → correlation header → random
  UUID fallback.
- Bind a Pino child logger to that ID and request-safe context through AsyncLocalStorage, and reach it with
  `getRequestLogger()`. Never thread loggers through domain-operation signatures.
- Return the correlation ID in the response so support can find the logs.

## Levels

- `error` — unexpected failure requiring investigation.
- `warn` — degraded continuation or intentional rejection worth noticing.
- `info` — meaningful state transitions and request bookkeeping.
- `debug` — high-frequency diagnostic signal, disabled in ordinary production output.

## Structured fields

- Pass caught exceptions as `error`. Pino's `errorKey` is set to `"error"` in
  `apps/web/src/lib/middleware/request-context.server.ts` — keep the two aligned or exceptions serialize as
  `{}`.
- Prefer stable domain identifiers and counts over whole objects.
- Use consistent names: `duration`, `statusCode`, `userId`, `resourceId`, `url`, `reason`, `upstreamError`.
  Strip credentials and sensitive query parameters before logging a URL.
- Never use `message`, `msg`, `level`, or `time` as merge-field names — collectors reserve them. Not lintable;
  it lives here.
- Production emits string severity names.

## Privacy

Never log names, email addresses, email bodies, tokens, secrets, cookies, or authorization headers; complete
auth, provider, or webhook payloads; user-entered document bodies; raw database rows or another user's
identifiers; or unbounded strings. Truncate any necessary user-provided diagnostic fragment and document why it
is safe.

The single exception is the deliberate local `EMAIL_MODE=log` delivery sink. Treat its magic link as a
credential: keep it out of shared and production logs, and never copy it into generic request or error events.

## Where logging happens

- Request middleware logs start and completion, method and path, status, and duration.
- Function middleware logs and sanitizes server-function errors before serialization.
- Handlers log only what middleware cannot see: silent no-op reasons, upstream failures, retries, or domain
  outcomes worth auditing.
- Network-boundary failures include the resolved target URL or service, without secrets.
- Shared and domain packages never import Pino *(enforced: Biome noRestrictedImports)* — return decision
  metadata or accept an observability callback.

## Client error contract

Clients receive a stable actionable message, a status, and an optional machine-readable code. Upstream text,
stacks, hosts, SQL, library details, and internal identifiers stay in logs tied to the correlation ID.

## Required tests

- Correlation propagation and the response header.
- Expected vs. unexpected error level and sanitization.
- No secret or PII fields in representative auth, email, webhook, and validation failures.
- Local log-mode delivery is isolated from generic request and error logging, and cannot be enabled silently
  for production use.
- Network errors include a safe resolved target.

Refs: `apps/web/src/lib/middleware/`.
