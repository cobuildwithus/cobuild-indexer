# Coordination Ledger (Active Only)

Use this file only for currently active coding work. Keep it minimal and current.

## Open Entries

| Agent/Session | Task | Files in Scope | Symbols (add/rename/delete) | Dependency Notes | Updated (YYYY-MM-DD) |
| --- | --- | --- | --- | --- | --- |
| codex-gpt5-pay-goaltreasury-kv-2026-03-04 | Remove `context.db.sql` join from `JBMultiTerminal:Pay` by introducing deterministic goal-treasury-by-project KV lookup | `ponder.schema.ts`, `src/goals/goal-configured.ts`, `src/contracts/jb-multi-terminal/pay.ts`, `agent-docs/references/{schema-relations-map,event-handler-map}.md`, `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` | add `_kv_goal_treasuries_by_project`; add `goalTreasuriesByProjectKey`; remove `loadGoalTreasuriesForSuckerGroup` SQL join helper; add/update KV maintenance + pay lookup helpers | Pay handler must derive goals via `sucker_group.projects` + per-project KV rows; GoalConfigured must keep KV rows deterministic on insert/update/replay | 2026-03-04 |
| codex-gpt5-goal-contributor-aggregate-2026-03-04 | Add goal-contributor aggregate projection for profile holdings and cut interface query to consume it | `ponder.schema.ts`, `src/contracts/jb-multi-terminal/pay.ts`, `agent-docs/references/{schema-relations-map,event-handler-map}.md`, `apps/web/prisma/cobuild.prisma` (interface), `apps/web/lib/domains/goals/goal-data.ts` (interface), related tests and coordination ledgers | add `goalContributorAggregate` projection/table; update pay handler to maintain aggregate rows keyed by goal+contributor; remove interface `getUserGoalHoldings` dependence on pay-event groupBy | Keep aggregate semantics aligned with current holdings logic (count only pay events with `newlyIssuedTokenCount > 0` and goal-level grouping derived from sucker group) | 2026-03-04 |
| codex-gpt5-flow-recipient-index-map-2026-03-04 | Add deterministic `flow+recipientIndex` mapping table and remove remaining PK-eligible legacy SQL paths in allocation handler | `ponder.schema.ts`, `src/helpers/ids.ts`, `src/flow/{recipient-created,allocation-committed}.ts`, `agent-docs/references/{schema-relations-map,event-handler-map}.md` | add `flowRecipientByIndex` table + key helper; write mapping on recipient creation; replace allocation key-state PK read and flow recipient PK update with `find/update`; replace recipient-index non-PK scan with mapping+PK lookups | Preserve allocation replay determinism and `distributionUnits = DEFAULT_DISTRIBUTION_UNITS + allocationUnitsSum` semantics while eliminating non-deterministic non-PK dependency | 2026-03-04 |

## Rules

1. Add a row before your first code edit for every coding task (single-agent and multi-agent).
2. Update your row immediately when scope or symbol-change intent changes.
3. Before deleting or renaming a symbol, check this table for dependencies.
4. Delete your row as soon as the task is complete or abandoned.
5. Leave only the header and empty table when there is no active work.
