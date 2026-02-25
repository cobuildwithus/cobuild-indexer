# Indexer Projections

## Projection Contracts

- All indexed events write deterministic state transitions.
- Legacy REV/JB projections and scaffold flow/treasury projections are both active in one runtime.
- `protocol_event` captures scaffold event payloads with bigint-safe argument serialization.
- Allocation commits are applied incrementally using decoded packed snapshots and per-key deltas.

## Consumer Expectations

- Use stable keys for joins (`id` columns documented in schema maps).
- Treat scaffold placeholder-address deployments as non-production scaffolding.
- Legacy surfaces (`project`, `ruleset`, `loan`, payment and swap tables) remain queryable during scaffold rollout.
- `distributionUnits` tracks `DEFAULT_DISTRIBUTION_UNITS + allocationUnitsSum` for active recipients.

## Dynamic Discovery

- Child flows are discovered from `GoalFlow:FlowRecipientCreated`.
- Budget treasuries + budget stake vaults are discovered from `BudgetTCR:BudgetStackDeployed`.

## Required Coupling on Change

When changing indexed events or projection behavior, update in one change set:
- `ponder.config.ts`
- `src/**` handlers
- `ponder.schema.ts`
- reference docs under `agent-docs/references/**`.
