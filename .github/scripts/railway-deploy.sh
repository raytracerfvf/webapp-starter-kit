#!/usr/bin/env bash
set -euo pipefail

: "${RAILWAY_TOKEN:?RAILWAY_TOKEN is required}"
: "${RAILWAY_PROJECT_ID:?RAILWAY_PROJECT_ID is required}"
: "${RAILWAY_ENVIRONMENT:?RAILWAY_ENVIRONMENT is required}"
: "${RAILWAY_SERVICE:?RAILWAY_SERVICE is required}"

readonly railway_cli_version="${RAILWAY_CLI_VERSION:-5.34.1}"

# Target flags are always explicit so a token scoped elsewhere fails loudly
# instead of deploying to the wrong place.
railway() {
  local subcommand="$1"
  shift
  pnpm --silent dlx "@railway/cli@${railway_cli_version}" "$subcommand" \
    --project "$RAILWAY_PROJECT_ID" \
    --environment "$RAILWAY_ENVIRONMENT" \
    --service "$RAILWAY_SERVICE" \
    "$@"
}

# Runs locally with the target's env injected — needs node_modules installed.
railway run -- pnpm db:migrate:deploy

# Railway forwards service variables to declared build ARGs; /api/health
# reports this commit. --skip-deploys: 'railway up' below is the only deploy.
railway variables --skip-deploys --set "APP_VERSION=${GITHUB_SHA:-unknown}"

# --ci so a failed build fails the job instead of detaching. The service's
# config-as-code path must point at railway.web.json.
railway up --ci
