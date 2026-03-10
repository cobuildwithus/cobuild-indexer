# Coordination Ledger (Active Only)

Use this file only for currently active coding work. Keep it minimal and current.

## Open Entries

| Agent/Session | Task | Files in Scope | Symbols (add/rename/delete) | Dependency Notes | Updated (YYYY-MM-DD) |
| --- | --- | --- | --- | --- | --- |
| codex-notification-fixes-main | Fix success-assertion cleanup and protocol notification payload contract follow-ups | `src/goals/success-assertion-cleared.ts`, `src/budgets/success-assertion-cleared.ts`, `src/helpers/protocolNotifications.ts`, `src/arbitrator/reward-notifications.ts`, `tests/protocol-notifications.test.ts`, `tests/protocol-notification-completeness-handlers.test.ts`, `tests/arbitrator-reward-notification-handlers.test.ts` | update `buildProtocolNotificationPayload`; update cleared-handler reminder invalidation; add wire round-trip regression coverage | Coordinates with `wire` payload contract updates in this turn; no schema changes planned | 2026-03-10 |

## Rules

1. Add a row before your first code edit for every coding task (single-agent and multi-agent).
2. Update your row immediately when scope or symbol-change intent changes.
3. Before deleting or renaming a symbol, check this table for dependencies.
4. Delete your row as soon as the task is complete or abandoned.
5. Leave only the header and empty table when there is no active work.
