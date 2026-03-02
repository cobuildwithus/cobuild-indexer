# CoBuild Indexer Architecture

Last updated: 2026-03-02

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

- Legacy surfaces are configured from `src/lib/config.ts`, `addresses.ts`, and `IndexerConfig` with project-scoped event filters for Base project ids.
- Scaffold root contracts in `ponder.config.ts` currently use placeholder addresses/start blocks until deployment coordinates are provided.
- Dynamic discovery:
  - `ChildFlow` addresses are factory-discovered from `GoalFlow:ChildFlowDeployed(recipient)`.
  - `PremiumEscrow` addresses are factory-discovered from `GoalFlow:ChildFlowDeployed(managerRewardPool)`.
  - `BudgetTreasury` addresses are factory-discovered from `BudgetTCR:BudgetStackDeployed`.

## Data Model

- Canonical tables are defined in `ponder.schema.ts` and include both stacks.
- Legacy entities:
  - `project`, `participant`, `pay_event`, `loan`, `ruleset`, `ruleset_activation_state`
  - `sucker_group`, `sucker`, `activity_log`, `cashout_coefficient_snapshot`
  - swap/event telemetry tables (`swap_executed`, `batch_reaction_swap`, `transaction_hash_to_batch_reaction_swaps`)
- Scaffold entities:
  - `protocol_event` (raw immutable scaffold audit log)
  - `flow`, `flow_recipient`, `allocation_key_state`, `allocation_entry_state`
  - `goal_treasury`, `budget_treasury`, `budget_stack`
  - `stake_vault`, `stake_position`, `juror`
  - `premium_escrow`, `premium_account`, `premium_claim`
  - `donation`, `hook_funding`, `pipeline_sync`, `hook_process`, `allocation_checkpoint`

## Invariants

1. Config + handlers + schema must remain aligned as one change set.
2. Handler writes must remain deterministic/replay-safe.
3. Legacy and scaffold handlers must remain simultaneously registered in `src/index.ts`.
4. `protocol_event` rows are immutable and deduplicated by event id.
5. Placeholder scaffold addresses and `startBlock: 0` are temporary and must be replaced before production indexing.
