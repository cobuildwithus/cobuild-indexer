# Switch repo-tools dependency to published semver

Status: completed
Created: 2026-03-05
Updated: 2026-03-05

## Goal

- Move `indexer` from a local `file:../repo-tools` dependency to the published `@cobuild/repo-tools@^0.1.4` package without changing runtime behavior.

## Success criteria

- `package.json` references `@cobuild/repo-tools@^0.1.4`.
- `pnpm-lock.yaml` resolves `@cobuild/repo-tools` from the registry instead of the sibling directory.
- Required process-only verification passes complete successfully.
- The active coordination row is removed and this plan is closed after the update.

## Scope

- In scope:
  - `package.json`
  - `pnpm-lock.yaml`
  - required active/completed execution-plan bookkeeping
- Out of scope:
  - production code, tests, and any other dependency changes

## Constraints

- Technical constraints:
  - Do not modify code paths outside dependency metadata and required process docs.
- Product/process constraints:
  - Respect active ownership in `COORDINATION_LEDGER.md`.
  - Run the docs/process-only verification baseline from `AGENTS.md`.

## Risks and mitigations

1. Risk: Lockfile refresh could pull unrelated dependency changes.
   Mitigation: Update only `@cobuild/repo-tools` and review the resulting lockfile diff before commit.

## Tasks

1. Add active coordination and execution-plan records for the process-only change.
2. Update `@cobuild/repo-tools` to `^0.1.4` and refresh `pnpm-lock.yaml`.
3. Run required process-only checks and inspect diffs for scope drift.
4. Close the plan, remove the active ledger row, and commit only touched files.

## Decisions

- Use the published semver package as the source of truth; do not preserve the local `file:` fallback in `indexer`.

## Verification

- Commands to run:
  - `pnpm install`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `bash scripts/check-agent-docs-drift.sh`
  - `bash scripts/doc-gardening.sh --fail-on-issues`
- Expected outcomes:
  - Lockfile resolves `@cobuild/repo-tools@^0.1.4`.
  - All required checks exit successfully.
Completed: 2026-03-05
