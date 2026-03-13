# Coordination Ledger (Active Only)

Use this file only for currently active coding work. Keep it minimal and current.

## Open Entries

| Agent/Session | Task | Files in Scope | Symbols (add/rename/delete) | Dependency Notes | Updated (YYYY-MM-DD) |
| --- | --- | --- | --- | --- | --- |
| Codex | Bridge indexer to the latest Base factory deployment while the refreshed `@cobuild/wire` package is still unpublished, and update scaffold start block. | `ponder.config.ts`, `src/goalFactory/goal-deployed.ts`, `tests/ponder-config.test.ts`, `tests/goal-factory-goal-deployed.test.ts`, `agent-docs/references/rpc-chain-config-map.md`, `agent-docs/references/address-abi-provenance.md`, active exec plan | None planned. | Use a narrow local GoalFactory entrypoint/event override until the published `@cobuild/wire` release exists; start block is `43288154`. | 2026-03-13 |
| Codex | Replace package-default review-gpt presets with indexer-owned registrations. | `scripts/review-gpt.config.sh` | None planned. | Must not touch the active wire refresh lane files. | 2026-03-13 |

## Rules

1. Add a row before your first code edit for every coding task (single-agent and multi-agent).
2. Update your row immediately when scope or symbol-change intent changes.
3. Before deleting or renaming a symbol, check this table for dependencies.
4. Delete your row as soon as the task is complete or abandoned.
5. Leave only the header and empty table when there is no active work.
