#!/usr/bin/env bash
set -euo pipefail

COBUILD_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

repo_tools_join_lines() {
  local out_var="$1"
  shift
  local joined=""
  local item
  for item in "$@"; do
    joined+="${item}"$'\n'
  done
  printf -v "$out_var" '%s' "$joined"
  export "$out_var"
}

cobuild_repo_tool_bin() {
  local bin_name="$1"
  local local_bin="$COBUILD_REPO_ROOT/node_modules/.bin/$bin_name"

  if [ -x "$local_bin" ]; then
    printf '%s\n' "$local_bin"
    return 0
  fi

  if command -v "$bin_name" >/dev/null 2>&1; then
    command -v "$bin_name"
    return 0
  fi

  echo "Error: missing repo-tools executable '$bin_name'. Install dependencies first." >&2
  return 1
}

required_files=(
  "agent-docs/index.md"
  "ARCHITECTURE.md"
  "AGENTS.md"
  "agent-docs/PLANS.md"
  "agent-docs/PRODUCT_SENSE.md"
  "agent-docs/QUALITY_SCORE.md"
  "agent-docs/RELIABILITY.md"
  "agent-docs/SECURITY.md"
  "agent-docs/design-docs/index.md"
  "agent-docs/product-specs/index.md"
  "agent-docs/product-specs/indexer-projections.md"
  "agent-docs/operations/verification-and-runtime.md"
  "agent-docs/operations/completion-workflow.md"
  "agent-docs/prompts/simplify.md"
  "agent-docs/prompts/test-coverage-audit.md"
  "agent-docs/prompts/task-finish-review.md"
  "agent-docs/references/README.md"
  "agent-docs/references/module-boundary-map.md"
  "agent-docs/references/event-handler-map.md"
  "agent-docs/references/schema-relations-map.md"
  "agent-docs/references/rpc-chain-config-map.md"
  "agent-docs/references/address-abi-provenance.md"
  "agent-docs/references/api-query-surface.md"
  "agent-docs/references/testing-ci-map.md"
  "agent-docs/references/ponder-llms.txt"
  "agent-docs/references/viem-llms.txt"
  "agent-docs/references/wagmi-cli-llms.txt"
  "agent-docs/references/hono-llms.txt"
  "agent-docs/references/juice-sdk-core-llms.txt"
  "agent-docs/generated/README.md"
  "agent-docs/generated/doc-inventory.md"
  "agent-docs/generated/doc-gardening-report.md"
  "agent-docs/exec-plans/active/README.md"
  "agent-docs/exec-plans/active/COORDINATION_LEDGER.md"
  "agent-docs/exec-plans/completed/README.md"
  "agent-docs/exec-plans/tech-debt-tracker.md"
)
repo_tools_join_lines COBUILD_DRIFT_REQUIRED_FILES "${required_files[@]}"
export COBUILD_DRIFT_CODE_CHANGE_PATTERN='^(src/|scripts/|ponder\\.config\\.ts$|ponder\\.schema\\.ts$|wagmi\\.config\\.ts$|abis\\.ts$|addresses(\\..+)?\\.ts$|AGENTS\\.md$|ARCHITECTURE\\.md$|README\\.md$|package\\.json$|tsconfig\\.json$|\\.github/workflows/(test|doc-gardening)\\.yml$)'
export COBUILD_DRIFT_CODE_CHANGE_LABEL='Architecture-sensitive code/process'
export COBUILD_DRIFT_LARGE_CHANGE_THRESHOLD='10'
export COBUILD_DRIFT_CHANGED_COUNT_EXCLUDE_PATTERN='^agent-docs/generated/|^agent-docs/exec-plans/(active|completed)/|^pnpm-lock\\.yaml$'
export COBUILD_DRIFT_ALLOW_RELEASE_ARTIFACTS_ONLY='0'
export COBUILD_COMMITTER_EXAMPLE='fix(indexer): align event ingestion guards'
export COBUILD_DOC_GARDENING_EXTRA_TRACKED_PATHS=ARCHITECTURE.md$'\n'
export COBUILD_AUDIT_CONTEXT_PREFIX='cobuild-indexer-audit'
export COBUILD_AUDIT_CONTEXT_TITLE='Cobuild Indexer Audit Bundle'
export COBUILD_AUDIT_CONTEXT_REPO_LABEL='indexer'
export COBUILD_AUDIT_CONTEXT_SENSITIVE_NOTE='Sensitive files (for example `.env*`, private keys/certs, and credential files) are always excluded.'
export COBUILD_AUDIT_CONTEXT_EXCLUDE_SENSITIVE='1'
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_PRUNE_DIR_NAMES \
  "node_modules" \
  ".git" \
  "dist" \
  "out" \
  "cache" \
  "coverage" \
  "audit-packages" \
  ".ponder"
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_ALWAYS_PATHS \
  "AGENTS.md" \
  "AGENT_NOTES.md" \
  "ARCHITECTURE.md" \
  "README.md" \
  "package.json" \
  "pnpm-lock.yaml" \
  "tsconfig.json" \
  "ponder.config.ts" \
  "ponder.schema.ts" \
  "abis.ts" \
  "addresses.ts" \
  "addresses.cobuild.ts" \
  "addresses.revnet.ts" \
  "wagmi.config.ts"
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_SCAN_SPECS \
  "src" \
  "scripts"
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_TEST_SCAN_SPECS \
  "tests" \
  "test"
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_DOC_SCAN_SPECS \
  "agent-docs:*.md"
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_CI_SCAN_SPECS \
  ".github/workflows"
