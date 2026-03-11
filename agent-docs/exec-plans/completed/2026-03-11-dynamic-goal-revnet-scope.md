# 2026-03-11 - Dynamic goal revnet scope

## Goal

Remove non-root hardcoded revnet/token scope from the indexer by discovering goal revnets and goal tokens from `GoalFactory:GoalDeployed`, while broadening shared JB/REV contract ingestion enough to cover goal revnets without opening ERC20 transfer indexing chainwide.

## Scope

- Broaden shared JB/REV contract filters away from the root-only project list where acceptable.
- Add dynamic goal-token transfer indexing from `GoalFactory:GoalDeployed`.
- Seed goal token -> project linkage from factory deployment events.
- Preserve the statically configured root Cobuild project/token path.
- Update docs/tests for the new ingestion model.

## Constraints

- Keep handlers replay-safe and deterministic.
- Do not use `context.db.sql`.
- Preserve additive compatibility with existing legacy projections.
- Keep ERC20 transfer ingestion scoped to the root token plus factory-discovered goal tokens.

## Verification

- `pnpm wire:ensure-published`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`

## Notes

- Shared singleton JB/REV contracts cannot be factory-address-filtered; discovery must happen in handler state rather than config-time dynamic project-id filters.
- Same-transaction deploy ordering means early deployment events are ingested by broadening shared contract filters rather than relying solely on the outer factory event.
Status: completed
Updated: 2026-03-11
Completed: 2026-03-11
