# Indexer Projections

## Projection Contracts

- All indexed events write deterministic state transitions.
- Legacy REV/JB projections and scaffold flow/treasury projections are both active in one runtime.
- `protocol_event` captures scaffold event payloads with bigint-safe argument serialization.
- `protocol_notification_outbox` captures recipient-resolved protocol notification intents as immutable replay-safe records for downstream inbox materialization.
- Allocation state is applied incrementally using `AllocationCommitted` (commit/weight) plus `AllocationSnapshotUpdated` (snapshot bytes when commit changes), preserving deterministic per-key deltas.
- `budget_stack` lifecycle handling is phase-aware: `BudgetStackActivationQueued` upserts an `ACTIVATION_QUEUED` stub row pre-deployment; deployed-only lifecycle events (`BudgetStackRemovalQueued`, `BudgetStackRemovalHandled`, `BudgetStackTerminalizationRetried`) fail closed on missing `budget_stack` rows.
- Governance notification targeting is maintained through deterministic helper tables instead of non-PK scans:
  - `goal_context_by_budget_tcr`
  - `goal_context_by_budget_stake_ledger`
  - `goal_stakeholder_audience`
  - `tcr_item`
  - `tcr_request`
- `tcr_request.requester` and `tcr_request.challenger` are reserved for canonical actor identities only. In the current TCR event surface, registration requester is derivable from `ItemSubmitted.submitter`; removal requester and challenger remain unknown until the protocol emits or exposes them deterministically.

## Consumer Expectations

- Use stable keys for joins (`id` columns documented in schema maps).
- Treat scaffold placeholder-address deployments as non-production scaffolding.
- Legacy surfaces (`project`, `ruleset`, `loan`, payment and swap tables) remain queryable during scaffold rollout.
- `distributionUnits` tracks `DEFAULT_DISTRIBUTION_UNITS + allocationUnitsSum` for active recipients.
- Downstream consumers should treat `protocol_notification_outbox` as the semantic source of truth for protocol inbox delivery; UI read-state remains downstream.

## Dynamic Discovery

- Budget TCRs are discovered from `BudgetTCRFactory:BudgetTCRStackDeployedForGoal`.
- Child flows are discovered from `BudgetTCRFactory:BudgetStackDeployed(childFlow)`.
- Premium escrows are discovered from `BudgetTCRFactory:BudgetStackDeployed(premiumEscrow)`.
- Budget treasuries are discovered from `BudgetTCRFactory:BudgetStackDeployed(budgetTreasury)`.

## Required Coupling on Change

When changing indexed events or projection behavior, update in one change set:
- `ponder.config.ts`
- `src/**` handlers
- `ponder.schema.ts`
- reference docs under `agent-docs/references/**`.
