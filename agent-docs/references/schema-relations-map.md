# Schema Relations Map

## Primary Entities

- Legacy stack:
  - `project`, `participant`, `pay_event`
  - `loan`, `borrow_loan_event`, `repay_loan_event`, `liquidate_loan_event`, `reallocate_loan_event`
  - `ruleset`, `ruleset_activation_state`, `erc20_to_project_id`, `pay_event_by_tx_beneficiary`
  - `sucker_group`, `sucker`, `activity_log`, `cashout_coefficient_snapshot`
  - `swap_executed`, `batch_reaction_swap`, `transaction_hash_to_batch_reaction_swaps`
- `protocol_event`
  - Immutable raw log rows (`event.id` keyed).
- `flow`
  - One row per flow contract address.
- `flow_recipient`
  - One row per `(flow, recipientId)`.
- `allocation_key_state`
  - Latest state for `(flow, strategy, allocationKey)`.
- `allocation_entry_state`
  - Per-recipient state for a specific allocation key.
- `goal_treasury`, `budget_treasury`, `budget_stack`
  - Goal/budget stack lifecycle and treasury snapshots.
- `stake_vault`, `stake_position`, `juror`
  - Stake totals, per-account positions, juror lifecycle.
- `reward_escrow`, `reward_claim`
  - Reward finalization aggregate + per-claim rows.
- `donation`
  - Normalized donation events across goal/budget treasuries.
- `hook_funding`, `pipeline_sync`, `hook_process`, `allocation_checkpoint`
  - Protocol telemetry/time-series tables.

## Key Contracts

- Legacy key examples:
  - `project.id` is the project id (`bigint`).
  - `participant.id` is a normalized lowercase address.
  - `ruleset.id` is `${projectId}-${rulesetId}`.
  - `loan.id` is `${revnetId}-${loanId}`.
- `flow.id` is the flow address.
- `flow_recipient.id` is `${flow}:${recipientId}`.
- `allocation_key_state.id` is `${flow}:${strategy}:${allocationKey}`.
- `allocation_entry_state.id` is `${flow}:${strategy}:${allocationKey}:${recipientId}`.
- Event-log style tables use `event.id` as PK.

## Relations (logical)

- `flow_recipient.flowId` -> `flow.id`
- `allocation_* .flowId` -> `flow.id`
- `stake_position.vault` and `juror.vault` -> `stake_vault.id`
- `reward_claim.escrow` -> `reward_escrow.id`
- `goal_treasury`/`budget_treasury` reference stack/vault/flow addresses as foreign identifiers.
