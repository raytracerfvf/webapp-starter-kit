#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // empty')"
if [[ -n "$file_path" ]]; then
  cd "${CLAUDE_PROJECT_DIR:?CLAUDE_PROJECT_DIR is required}"
  pnpm exec biome check --write --no-errors-on-unmatched "$file_path"
fi
