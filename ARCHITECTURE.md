# CoBuild Indexer Architecture

Last updated: 2026-03-11

## Runtime Shape

- Network scope: Base (`chainId 8453`) only.
- Ingestion/runtime entrypoints:
  - Config: `ponder.config.ts`
  - Schema: `ponder.schema.ts`
  - Handler registry: `src/index.ts`
- Contract/event handlers are organized in one integrated runtime:
  - Legacy stack: `src/contracts/**` (REV/JB/Cobuild swap/token-bought + cron handlers).
  - Scaffold stack: `src/flow/**`, `src/goals/**`, `src/budgets/**`, `src/stakeVault/**`, `src/stakeLedger/**`, `src/premiumEscrow/**`, `src/tcr/**`, `src/tcrFactory/**`, `src/pipeline/**`, `src/hook/**`.
- Shared runtime modules:
  - `src/lib/**` for chain/RPC/config/runtime helpers.
  - `src/util/**` for formatting and identifier utilities.
  - `src/helpers/**` for deterministic projection helpers used by scaffold handlers.

## Indexing Model

- Legacy singleton surfaces are configured from `src/lib/config.ts`, `addresses.ts`, and `IndexerConfig` with explicit event allowlists on Base shared contracts rather than per-project filters.
- Scaffold entrypoints in `ponder.config.ts` use canonical Base addresses exported by `@cobuild/wire` (`baseEntrypoints`).
- Goal stack contracts are first-hop factory-discovered from `GoalFactory:GoalDeployed` (`goalFlow`, `goalTreasury`, `stakeVault`, `budgetStakeLedger`, `splitHook`, routers, success resolver).
- Dynamic discovery:
  - Root-token transfers remain bound to the wire-sourced `COBUILD_TOKEN_ADDRESS`, and goal-token transfers are discovered from `GoalFactory:GoalDeployed(stack.goalToken)`.
  - `BudgetTCR` addresses are discovered from `BudgetTCRFactory:BudgetTCRStackDeployedForGoal`.
  - `ChildFlow`, `PremiumEscrow`, and `BudgetTreasury` addresses are discovered from `BudgetTCRFactory:BudgetStackDeployed`.
  - `GoalFlowAllocationLedgerPipeline` addresses are discovered from the pipeline-extended `GoalFactory:GoalDeployed` payload (`stack.goalFlowAllocationLedgerPipeline`).
  - Factory discovery is rooted only at static entrypoints (`GoalFactory`, `BudgetTCRFactory`), with no manual emitter bootstrap lists or handler-side emitter guards.

## Data Model

- Canonical tables are defined in `ponder.schema.ts` and include both stacks.
- Legacy entities:
  - `project`, `participant`, `pay_event`, `loan`, `ruleset`, `ruleset_activation_state`
  - `sucker_group`, `sucker`, `activity_log`, `cashout_coefficient_snapshot`
  - swap/event telemetry tables (`swap_executed`, `batch_reaction_swap`, `transaction_hash_to_batch_reaction_swaps`)
- Scaffold entities:
  - `protocol_event` (raw immutable scaffold audit log)
  - `keeper_outbox` (keeper-consumable outbox stream with deterministic block/log ordering id)
  - `flow`, `flow_recipient`, `allocation_key_state`, `allocation_entry_state`
  - `goal_treasury`, `goal_treasury_series`, `goal_treasury_series_cursor`, `goal_contributor_aggregate`
  - `budget_treasury`, `budget_stack`
  - `stake_vault`, `stake_position`, `juror`
  - `premium_escrow`, `premium_account`, `premium_claim`
  - `donation`, `hook_funding`, `pipeline_sync`, `hook_process`, `allocation_checkpoint`

## Invariants

1. Config + handlers + schema must remain aligned as one change set.
2. Handler writes must remain deterministic/replay-safe.
3. Legacy and scaffold handlers must remain simultaneously registered in `src/index.ts`.
4. `protocol_event` rows are immutable and deduplicated by event id.
5. `keeper_outbox` rows are immutable and deduplicated by deterministic outbox id (`block*1_000_000 + logIndex`).
6. Entry-point address provenance must stay aligned with `@cobuild/wire` exports, and factory discovery contracts/events must stay aligned with deployed `v1-core` emitters.
