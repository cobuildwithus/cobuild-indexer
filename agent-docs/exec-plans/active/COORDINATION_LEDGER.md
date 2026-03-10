# Coordination Ledger (Active Only)

Use this file only for currently active coding work. Keep it minimal and current.

## Open Entries

| Agent/Session | Task | Files in Scope | Symbols (add/rename/delete) | Dependency Notes | Updated (YYYY-MM-DD) |
| --- | --- | --- | --- | --- | --- |
| codex-premium-escrow-topology | Fix premium escrow topology to use factory-emitted escrow address instead of child manager reward pool | `ponder.config.ts`, `src/flow/child-flow-deployed.ts`, `src/tcr/budget-stack-deployed.ts`, `src/tcrFactory/budget-stack-deployed.ts`, `src/index.ts`, `src/budgets/budget-configured.ts`, `src/tcr/budget-allocation-mechanism-deployed.ts`, `tests/premium-escrow-linkage-handlers.test.ts`, `agent-docs/generated/doc-inventory.md`, `agent-docs/references/event-handler-map.md` | add: `BudgetTCRFactory:BudgetStackDeployed` handler, `BudgetTCRFactoryProtocolEventsAbi`; rename: none; delete: none | Keep `flow.managerRewardPool` as the pool address and treat the factory-emitted `BudgetStackDeployed.premiumEscrow` address as authoritative for budget/premium topology rows and mechanism funding escrow while keeping local `BudgetTCR:BudgetStackDeployed` audit-only | 2026-03-10 |
| codex-withdrawal-prep-complete | Add a visible underwriter withdrawal prep completion notification while preserving open-state invalidation | `src/stakeVault/underwriter-withdrawal-prepared.ts`, `tests/actionable-financial-notification-handlers.test.ts`, `agent-docs/references/event-handler-map.md` | add: `underwriter_withdrawal_prep_complete` reason; rename: none; delete: none | Keep `underwriter_withdrawal_prep_required` as the open/close state keyed by `underwriter_withdrawal_prep_state`; completion must use a separate append-only source key so invalidate and complete can coexist | 2026-03-10 |

## Rules

1. Add a row before your first code edit for every coding task (single-agent and multi-agent).
2. Update your row immediately when scope or symbol-change intent changes.
3. Before deleting or renaming a symbol, check this table for dependencies.
4. Delete your row as soon as the task is complete or abandoned.
5. Leave only the header and empty table when there is no active work.
