# Treasury Terminal Failure Event Sync

## Goal

Keep indexer treasury raw-event handlers aligned with the published `@cobuild/wire` GoalTreasury and BudgetTreasury ABI event names after the latest `v1-core` implementation rollout.

## Scope

- Replace removed `TerminalSideEffectFailed` event registrations with the concrete terminal failure events now exposed by GoalTreasury and BudgetTreasury.
- Preserve the existing `insertProtocolEvent` raw-event logging behavior.
- Remove the temporary local ABI bridge once the refreshed `@cobuild/wire` package is published.
- Update the event-handler map to reflect the new treasury event inventory.

## Constraints

- Keep replay behavior unchanged.
- Do not widen handler side effects beyond raw `protocol_event` and `keeper_outbox` insertion.
- Avoid unrelated Ponder config or schema changes unless the new ABI surface requires them.

## Done

- Added the active coordination-ledger entry for this downstream ABI sync.
- Replaced the removed `GoalTreasury:TerminalSideEffectFailed` handler with concrete GoalTreasury terminal failure event registrations.
- Replaced the removed `BudgetTreasury:TerminalSideEffectFailed` handler with concrete BudgetTreasury terminal failure event registrations.
- Bumped `@cobuild/wire` to `^0.1.6` and removed the temporary local treasury ABI bridge after the published package exposed the concrete terminal failure events directly.
- Restored direct `GoalTreasuryAbi` and `BudgetTreasuryAbi` usage in `ponder.config.ts`.
- Kept regression coverage on the concrete goal and budget terminal failure event handler registrations in `tests/goals-terminal-side-effect-failed.test.ts` and `tests/budgets-terminal-side-effect-failed.test.ts`.
- Updated `agent-docs/references/event-handler-map.md` and `agent-docs/index.md` to reflect the new treasury event inventory and active plan.
- Verified `indexer` with `pnpm typecheck`, `pnpm lint`, `pnpm test`, `bash scripts/check-agent-docs-drift.sh`, and `bash scripts/doc-gardening.sh --fail-on-issues`.
- Ran simplify, coverage, and completion review passes around the bridge-removal cleanup; the simplify and coverage audits found no additional code changes required.

## Now

- None.

## Next

- Keep the concrete terminal failure event handlers aligned with future published `@cobuild/wire` treasury ABI refreshes.
