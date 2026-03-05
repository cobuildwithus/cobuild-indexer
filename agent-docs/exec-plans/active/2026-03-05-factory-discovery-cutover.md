# Factory Discovery Cutover (Wire/V1-Core Sync)

## Goal

Cut indexer scaffold discovery over to static-factory-rooted event discovery using the latest `@cobuild/wire` addresses/ABIs, removing handler-side emitter guard filtering and bootstrap address list requirements.

## Scope

- Update `ponder.config.ts` scaffold contract sources and start blocks.
- Remove temporary `src/helpers/discoveryGuards.ts` usage from handlers.
- Update architecture and reference docs describing discovery/event provenance.

## Constraints

- Preserve deterministic replay behavior and existing projection table semantics.
- Keep static factory roots limited to `GoalFactory` and `BudgetTCRFactory`.
- Do not introduce `context.db.sql` for emitter filtering.

## Done

- Updated scaffold `startBlock` to `42941210`.
- Rooted contract discovery in factory events (no bootstrap address arrays, no handler-side emitter guards).
- Removed `discoveryGuards` helper and all consumer imports/checks.
- Aligned all GoalFactory stack discovery fields to one pipeline-extended `GoalDeployed` event signature (v1-core source of truth).
- Updated architecture/product/reliability/reference docs + docs index for the new discovery model.

## Now

- None.

## Next

- Move this plan to `agent-docs/exec-plans/completed/` once branch/release finalization is complete.
