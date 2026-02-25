# AGENTS.md

## Purpose

This file is the routing map for agent work in this repository.
Durable guidance lives in `agent-docs/`.

## Precedence

1. Explicit user instruction in the current chat turn.
2. `Hard Rules (Non-Negotiable)` in this file.
3. Other sections in this file.
4. Detailed process docs under `agent-docs/**`.

If instructions still conflict after applying this order, ask the user before acting.

## Read Order

1. `agent-docs/index.md`
2. `ARCHITECTURE.md`
3. `agent-docs/product-specs/indexer-projections.md`
4. `agent-docs/RELIABILITY.md`
5. `agent-docs/SECURITY.md`
6. `agent-docs/references/module-boundary-map.md`
7. `agent-docs/references/event-handler-map.md`
8. `agent-docs/references/schema-relations-map.md`
9. `agent-docs/references/rpc-chain-config-map.md`
10. `agent-docs/references/testing-ci-map.md`
11. `agent-docs/operations/verification-and-runtime.md`
12. `agent-docs/operations/completion-workflow.md`
13. `AGENT_NOTES.md` (historical context when needed)

## Hard Rules (Non-Negotiable)

- Never access `.env` or `.env*` files.
- Keep event handlers replay-safe: do not introduce wall-clock or random behavior in projection decisions.
- If adding/changing indexed events, update all coupled surfaces together:
  - `ponder.config.ts` filters/contracts,
  - `src/contracts/**` handlers,
  - `ponder.schema.ts` tables/keys,
  - `agent-docs/references/event-handler-map.md` and affected reliability/product docs.
- Treat handler `readContract` calls as deterministic boundaries: pin reads to event context when possible, or mark them best-effort metadata.
- Default to additive integration with existing indexer services; do not perform hard cutovers or remove legacy surfaces unless the user explicitly requests it.
- Historical plan docs under `agent-docs/exec-plans/completed/` are immutable snapshots.
- Always keep `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` current for every coding task (single-agent and multi-agent): claim scope before first edit, list planned symbol add/rename/delete work, and remove your entry when done.
- Any spawned subagent that may review or edit code must read `COORDINATION_LEDGER.md` first and must not touch files/symbols owned by another active entry.
- Run completion workflow audit passes (`simplify`, `test-coverage-audit`, `task-finish-review`) for every non-doc change that touches production code or tests; skip only when the user explicitly says to skip for that turn.
- Docs/process-only changes skip completion workflow audit passes unless the user explicitly asks to run them.
- Keep this file short and route-oriented; keep durable detail in `agent-docs/`.

## How To Work

- Before implementation, run a quick assumptions check: ask for clarification only when ambiguity is high-impact (scope, security invariants, chain/runtime behavior).
- Continue working in the current tree when unrelated dirty changes appear.
- Do not pause solely because the worktree is dirty; treat out-of-scope changes as context unless a hard rule is at risk.
- Never revert, delete, or rewrite existing edits you did not make unless the user explicitly asks.
- If unrelated breakage appears in files you did not touch, continue scoped work; only fix it when your changes caused it or the user asked.
- If you create temporary artifacts for testing/exploration, remove them before handoff unless the user asked to keep them.
- Do not introduce “break now, fix later” phases.
- For multi-file or high-risk work, add an execution plan in `agent-docs/exec-plans/active/`.
- When architecture-significant behavior changes, update matching docs in `agent-docs/` and `agent-docs/index.md`.

## Commit and Handoff

- Same-turn task completion = acceptance, unless the user explicitly says `review first` or `do not commit`.
- If files changed and required checks are green, run `scripts/committer "type(scope): summary" path/to/file1 path/to/file2` before final handoff.
- Use `scripts/committer` only (no manual `git commit`).
- Agent-authored commit messages should use Conventional Commits (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`).
- If no files changed, do not create a commit.
- Commit only exact file paths touched in the current turn.
- Do not skip commit just because the tree is already dirty.
- If a touched file already had edits, still commit and explicitly note that in handoff.
- On commit failure, report the exact error and retry with the appropriate fix.

## Required Checks

- Always run:
  - `pnpm typecheck`
  - `pnpm lint`
- Run `pnpm test` when a `test` script exists in `package.json`.
- For docs/process-only updates, also run:
  - `bash scripts/check-agent-docs-drift.sh`
  - `bash scripts/doc-gardening.sh --fail-on-issues`

## Completion Workflow

- For any non-doc change that touches production code or tests, run the full completion workflow in `agent-docs/operations/completion-workflow.md` before final handoff.
- Skip this workflow for docs/process-only turns unless the user explicitly asks for the full audit sequence.

## Notes

- `agent-docs/index.md` is the canonical docs map. Update it whenever docs move or change.
