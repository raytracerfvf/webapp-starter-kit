#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // .tool_input.notebook_path // empty')"
[[ -z "$file_path" ]] && exit 0

rel="${file_path#"${CLAUDE_PROJECT_DIR:?CLAUDE_PROJECT_DIR is required}"/}"

case "$rel" in
  *.gen.ts | packages/shared/drizzle/* | packages/api-client/src/client/* | apps/web/i18n/paraglide/* | apps/web/.content-collections/* | apps/api-python/openapi.json | pnpm-lock.yaml)
    cat >&2 <<EOF
BLOCKED: $rel is generated output. Change the source and regenerate instead:
- Drizzle migrations/snapshots (packages/shared/drizzle/**): edit src/db/schema/** then 'pnpm db:generate'
- paraglide / content-collections / TS API client: 'pnpm codegen'
- apps/api-python/openapi.json: 'pnpm codegen:api-client'
- routeTree.gen.ts: written by the router plugin during dev/build
- auth.gen.ts: Better Auth CLI generate, then review and migrate (auth-and-email skill)
- pnpm-lock.yaml: pnpm CLI only
EOF
    exit 2
    ;;
esac

exit 0
