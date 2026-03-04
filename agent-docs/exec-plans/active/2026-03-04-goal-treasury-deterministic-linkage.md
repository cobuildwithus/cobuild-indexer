# 2026-03-04 Goal Treasury Deterministic Linkage

## Goal

Add deterministic goal treasury linkage surfaces for interface queries by storing canonical project keys, canonical route fields, explicit recipient-budget links, and precomputed goal treasury series snapshots.

## Scope

- Update `goal_treasury` schema with canonical project/route fields.
- Add explicit `flow_recipient.budget_treasury` linkage and deterministic lookup KV tables.
- Add `goal_treasury_series` snapshots with inflow/outflow/balance derived from sync events.
- Update handlers in goals/flow/tcr/budgets/stake-ledger domains to maintain new fields without `context.db.sql`.
- Update schema and handler reference docs.

## Constraints

- No raw SQL string usage and no `context.db.sql` usage in touched files.
- Keep all projection writes deterministic and replay-safe.
- Preserve existing projection behavior outside the new deterministic linkage fields.

## Verification

- Completion workflow: simplify -> test-coverage-audit -> task-finish-review.
- Required checks: `pnpm typecheck`, `pnpm lint`, `pnpm test` (if script exists), `pnpm docs:drift`, `pnpm docs:gardening`.
