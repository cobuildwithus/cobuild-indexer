# Event Handler Map

## Legacy REV/JB Stack

- `REVDeployer:*` in `src/contracts/rev-deployer/**`
  - `DeployRevnet`
- `JBTokens:*` in `src/contracts/jb-tokens/**`
  - `DeployERC20`, `Mint`, `Burn`
- `JBController:*` in `src/contracts/jb-controller/**`
  - `LaunchProject`, `MintTokens`, `SendReservedTokensToSplits`, `SetUri`
- `JBMultiTerminal:*` in `src/contracts/jb-multi-terminal/**`
  - `AddToBalance`, `CashOutTokens`, `Pay`, `SendPayouts`, `SetAccountingContext`, `UseAllowance`
  - `Pay` also maintains `goal_contributor_aggregate` (per-goal contributor totals for holdings queries) for pay events with `newlyIssuedTokenCount > 0`.
  - `Pay` resolves goal-treasury targets via `sucker_group.projects` + `goal_treasuries_by_project` KV rows (no non-PK join lookup on the hot path).
- `JBRulesets:*` in `src/contracts/jb-ruleset/**`
  - `RulesetQueued`, `RulesetInitialized`
- `JBProjects:Create` in `src/contracts/jb-projects/create.ts`
- `JBSuckersRegistry:SuckerDeployedFor` in `src/contracts/jb-suckers-registry/**`
  - Maintains `sucker_group` membership plus deterministic `_kv_sucker_group_by_address` rows for PK-only address->group resolution.
- `RevLoans:*` in `src/contracts/rev-loans/**`
  - `Borrow`, `Liquidate`, `ReallocateCollateral`, `RepayLoan`, `Transfer`
- `ERC20:Transfer` (project token transfers) in `src/contracts/erc20/transfer.ts`
- `CobuildSwap:BatchReactionSwap` + dynamic `TokenBought:Transfer` in `src/contracts/cobuild-swap/**` and `src/contracts/token-bought/**`
- Block/cron logic in `src/contracts/crons/ruleset-changed.ts`

## Flow

- `GoalFlow:*` and `ChildFlow:*` handlers in `src/flow/**`
  - `Initialized`, `FlowInitialized`, `ChildFlowDeployed`, `RecipientCreated`, `FlowRecipientCreated`, `RecipientRemoved`, `MetadataSet`
  - `TargetOutflowRateUpdated`, `TargetOutflowRefreshFailed`
  - `AllocationCommitted`, `AllocationSnapshotUpdated`, `SuperTokenSwept`
  - `RecipientCreated` maintains deterministic `flow_recipient_by_index` rows (`${flow}:${recipientIndex}` -> `flow_recipient.id`) for compact allocation snapshot lookups.
  - `ChildFlowDeployed` records the child flow topology plus `flow.managerRewardPool`, but does not treat that manager reward pool address as the canonical `premiumEscrow` id.
- `FlowActualRateRefresh:block` handler in `src/flow/actual-flow-rate-refresh.ts`
  - deterministic block cron projection refresh for `flow.currentFlowRate` via `IFlow.getActualFlowRate()` on queued flow addresses.
  - round-robin queue state is maintained in `flow_actual_rate_refresh_state` and enqueue hooks in `FlowInitialized`, `ChildFlowDeployed`, and `FlowRecipientCreated`.
  - writes freshness/error telemetry fields (`currentFlowRateObservedAt*`, `currentFlowRateStale`, failure count/reason) on `flow`.
- Dynamic factory discovery in `ponder.config.ts`
  - `ChildFlow` addresses: `BudgetTCRFactory:BudgetStackDeployed(childFlow)`
  - `PremiumEscrow` addresses: `BudgetTCRFactory:BudgetStackDeployed(premiumEscrow)`

## Goal Treasury

- `GoalTreasury:*` handlers in `src/goals/**`
  - `Initialized`, `GoalConfigured`, `StateTransition`, `GoalFinalized`
  - `SuccessAssertionRegistered`, `SuccessAssertionCleared`, `SuccessAssertionResolutionFailClosed`, `SuccessAssertionFinalizeFailed`
  - `DonationRecorded`, `FlowRateSynced`, `FlowRateSyncManualInterventionRequired`, `FlowRateZeroingFailed`, `FlowRateSyncCallFailed`
  - `ReassertGraceActivated`, `ResidualSettled`
  - `HookFundingRecorded`, `HookFundingDeferred`, `HookDeferredFundingSettled`
  - `TerminalDeferredHookFundingSettlementFailed`, `TerminalFlowStopFailed`, `TerminalResidualSettlementFailed`, `TerminalStakeVaultResolutionFailed`
  - `GoalConfigured` also writes canonical project + canonical route linkage fields on `goal_treasury`.
  - `GoalConfigured` also maintains deterministic `goal_treasuries_by_project` KV rows keyed by `${chainId}-${projectId}`.
  - `GoalConfigured` persists event-provided `jurorSlasher`, `underwriterSlasher`, `successResolver`, `goalToken`, and `cobuildToken`, and links `parentFlow`/`strategy` from the existing `flow` row.
  - `GoalConfigured` also maintains notification lookup rows:
    - `goal_context_by_budget_tcr`
    - `goal_context_by_budget_stake_ledger`
    - `goal_stakeholder_audience`
  - `FlowRateSynced` also writes `goal_treasury_series` + `goal_treasury_series_cursor`.
  - `StateTransition` also emits recipient-resolved `protocol_notification_outbox` rows for `goal_active`, `goal_succeeded`, and `goal_expired`.
  - Goal success-assertion lifecycle handlers also emit recipient-resolved `protocol_notification_outbox` rows for:
    - `goal_success_assertion_registered`
    - `goal_success_assertion_cleared`
    - `goal_success_assertion_resolution_fail_closed`
    - `goal_success_assertion_finalize_failed`
    - `goal_success_assertion_reassert_grace_activated`
  - `SuccessAssertionRegistered` also maintains `treasury_success_assertion_context` for resolver-side assertionId -> treasury recovery and invalidates any prior reassert-grace reminder cycle when a new assertion supersedes it.
  - `ReassertGraceActivated` also emits `protocol_notification_schedule` rows for `goal_success_assertion_reassert_grace_ending_soon`; terminal success/fail-expiry handlers invalidate that cycle when the grace window closes early.

## Budget Treasury

- `BudgetTreasury:*` handlers in `src/budgets/**`
  - `Initialized`, `BudgetConfigured`, `StateTransition`, `BudgetFinalized`
  - `SuccessAssertionRegistered`, `SuccessAssertionCleared`, `SuccessAssertionResolutionFailClosed`, `SuccessAssertionFinalizeFailed`, `SuccessResolutionDisabled`
  - `DonationRecorded`, `FlowRateSynced`, `FlowRateSyncManualInterventionRequired`, `FlowRateZeroingFailed`, `FlowRateSyncCallFailed`
  - `ReassertGraceActivated`, `ResidualSettled`
  - `TerminalFlowStopFailed`, `TerminalParentGoalSyncNotApplied`, `TerminalParentPruneFailed`, `TerminalPremiumEscrowCloseFailed`, `TerminalResidualSettlementToParentFailed`
  - `StateTransition` also emits recipient-resolved `protocol_notification_outbox` rows for:
    - `budget_active`
    - `budget_succeeded`
    - `budget_failed`
    - `budget_expired`
    - audience includes current budget underwriters plus canonical request actors, the budget controller, and the goal owner when indexed
  - Budget success-assertion lifecycle handlers also emit recipient-resolved `protocol_notification_outbox` rows for:
    - `budget_success_assertion_registered`
    - `budget_success_assertion_cleared`
    - `budget_success_assertion_resolution_fail_closed`
    - `budget_success_assertion_finalize_failed`
    - `budget_success_assertion_reassert_grace_activated`
    - `budget_success_resolution_disabled`
  - `SuccessAssertionRegistered` also maintains `treasury_success_assertion_context` for resolver-side assertionId -> treasury recovery and invalidates any prior reassert-grace reminder cycle when a new assertion supersedes it.
  - `ReassertGraceActivated` also emits `protocol_notification_schedule` rows for `budget_success_assertion_reassert_grace_ending_soon`; terminal success/fail-expiry and resolution-disabled handlers invalidate that cycle when the grace window closes early.

## Stake and Jurors

- `GoalStakeVault:*` handlers in `src/stakeVault/**`
  - stake/withdraw totals, goal resolution, juror lifecycle/slashing/delegation, underwriter slashing telemetry
  - includes `AllocationSyncFailed` telemetry
  - goal/cobuild stake and withdraw handlers also maintain `goal_stakeholder_audience` membership from net stake.
  - `GoalResolved` opens `underwriter_withdrawal_prep_required` open/close notifications for current goal stakeholders.
  - `UnderwriterWithdrawalPrepared` invalidates that open-state notification when `complete=true` and emits a separate append-only `underwriter_withdrawal_prep_complete` notification.
- `BudgetStakeLedger:*` handlers in `src/stakeLedger/**`
  - `BudgetRegistered`, `BudgetRemoved`, `AllocationCheckpointed`
  - `BudgetRegistered` and `BudgetRemoved` also emit recipient-resolved `protocol_notification_outbox` rows for `budget_activated` and `budget_removed`, including the budget controller when indexed.

## Arbitrator

- `ERC20VotesArbitrator:*` and `MechanismERC20VotesArbitrator:*` handlers in `src/arbitrator/**`
  - `DisputeCreated`, `VoteCommitted`, `VoteRevealed`, `DisputeExecuted`, `RewardWithdrawn`, `SlashRewardsWithdrawn`, `VoterSlashed`
  - `DisputeCreated` snapshots current jurors into `arbitrator_dispute` + `juror_dispute_member`, emits `juror_dispute_created`, and schedules `juror_voting_open`, `juror_reveal_open`, `juror_vote_deadline_soon`, and `juror_reveal_deadline_soon`.
  - `VoteCommitted` and `VoteRevealed` invalidate the relevant deadline reminder cycles when a juror has already acted.
  - `DisputeExecuted` emits `juror_ruling_final` and `juror_slashable`, then refreshes per-juror `juror_reward_claimable` cycle state.
  - `SlashRewardsWithdrawn` + `RewardWithdrawn` aggregate normal reward and slash buckets into append-only `juror_reward_claimed` notifications and then resync `juror_reward_claimable`.
  - Reward-cycle sync uses deterministic pinned `getVoterRoundStatus` reads; `juror_vote_receipt.claimableNotificationSourceId` persists cycle identity across refresh/invalidate transitions.

## Premium Escrow

- `PremiumEscrow:*` handlers in `src/premiumEscrow/**`
  - `Initialized`, `ManagerRewardPoolConnected`, `PremiumIndexed`, `AccountCheckpointed`, `Claimed`, `Closed`
  - `UnderwriterSlashed`, `UnderwriterSlashCalculated`, `UnclaimablePremiumSwept`, `OrphanPremiumRecycled`
  - raw telemetry only: `CreditIndexed`, `LateResidualSettlementFailed`

## TCR and Factory

- `BudgetTCR:*` handlers in `src/tcr/**`
  - deploy/activation/removal/sync telemetry
  - allocation mechanism/credit cap/terminal recipient telemetry
  - governance/Kleros telemetry (`Initialized`, `RequestSubmitted`, `RequestEvidenceGroupID`, `MetaEvidence`, `Evidence`, `Dispute`, `Ruling`, `ItemSubmitted`, `ItemStatusChange`)
  - funding/terminalization telemetry (`SubmissionDepositPaid`, `SubmissionDepositTransferred`, `BudgetTerminalizationStepFailed`)
  - lifecycle projection semantics:
    - `BudgetStackActivationQueued` upserts an `ACTIVATION_QUEUED` stub row for pre-deployment visibility.
    - `BudgetStackRemovalQueued`, `BudgetStackRemovalHandled`, and `BudgetStackTerminalizationRetried` enforce a strict existing `budget_stack` invariant (missing row is a hard projection error).
  - governance notification projections:
    - `ItemSubmitted` upserts `tcr_item`
    - `ItemStatusChange` updates `tcr_item.latestRequestIndex/currentStatus`
    - `BudgetStackActivationQueued` emits `budget_accepted`
    - `BudgetStackRemovalQueued` emits `budget_removal_accepted`
- `BudgetTCRProtocolEvents:*` handler bridge in `src/tcr/**`
  - temporary local ABI bridge for `RequestSubmitted` and `Dispute` until the refreshed `@cobuild/wire` package publishes the requester/challenger event cutover
  - lifecycle projection semantics:
    - `RequestSubmitted` upserts `tcr_request` from the emitted requester address, emits `budget_proposed` / `budget_removal_requested`, and schedules `budget_*_challenge_window_ending_soon` reminders from a pinned `getRequestState` read.
    - `Dispute` updates `tcr_request` dispute state from the emitted request index + challenger fields, emits `budget_proposal_challenged` / `budget_removal_challenged`, and invalidates the matching challenge-window reminder cycle.
- `AllocationMechanismTCR:*` handlers in `src/mechanismTcr/**`
  - `RequestSubmitted`, `Dispute`, `ItemSubmitted`, `ItemStatusChange`, `Ruling`, `MechanismActivated`, `MechanismRemoved`, `MechanismActivationQueued`, `MechanismRemovalQueued`
  - `RequestSubmitted` mirrors `tcr_request` actor attribution for mechanism governance, emits `mechanism_proposed` / `mechanism_removal_requested`, and schedules `mechanism_*_challenge_window_ending_soon` reminders from a pinned `getRequestState` read.
  - `Dispute` emits `mechanism_challenged` and invalidates the matching challenge-window reminder cycle.
  - `MechanismActivationQueued` and `MechanismRemovalQueued` emit accepted/removal-accepted notifications and invalidate stale challenge-window reminder cycles.
- `BudgetTCRFactory:*` handlers in `src/tcrFactory/**`
  - deployment-for-goal telemetry
  - `BudgetStackDeployed` maintains deterministic recipient/childFlow -> budget treasury lookup KV tables, recipient FK linkage, and the canonical budget/premium-escrow topology using the factory-emitted `premiumEscrow` address.
  - dynamic discovery source for:
    - `BudgetTCR` via `BudgetTCRStackDeployedForGoal(budgetTCR)`
    - `BudgetTreasury` via `BudgetStackDeployed(budgetTreasury)`
    - `ChildFlow` via `BudgetStackDeployed(childFlow)`
    - `PremiumEscrow` via `BudgetStackDeployed(premiumEscrow)`
- `GoalFactory:GoalDeployed` handler in `src/goalFactory/goal-deployed.ts`
  - writes `goal_factory_deployment` rows keyed by `${chainId}:${goalRevnetId}` with emitted stack addresses (including router/resolver addresses).
  - also seeds notification lookup rows:
    - `goal_context_by_budget_tcr`
    - `goal_context_by_budget_stake_ledger`

## Pipeline and Hook

- `GoalFlowAllocationLedgerPipeline:*` handlers in `src/pipeline/**`
  - child allocation sync attempt/skip telemetry
  - raw telemetry only: `ChildAllocationSyncFailed`, `ChildSyncDebtOpened`, `ChildSyncDebtCleared`
- `GoalRevnetSplitHook:*` handlers in `src/hook/**`
  - `Initialized`, `GoalFundingProcessed`, `GoalSuccessSettlementProcessed`

## Resolver and Routers

- `UMATreasurySuccessResolver:*` handlers in `src/umaResolver/**`
  - `AssertionPrepared` remains raw telemetry only.
  - `AssertionDisputed`, `TreasurySuccessResolved`, and `AssertionSettled` emit goal/budget success-assertion lifecycle notifications via `treasury_success_assertion_context` or direct treasury-address resolution.
- `JurorSlasherRouter:*` handlers in `src/jurorSlasherRouter/**`
  - raw telemetry only: `SlasherAuthorizationSet`
- `UnderwriterSlasherRouter:*` handlers in `src/underwriterSlasherRouter/**`
  - raw telemetry only: `PremiumEscrowAuthorizationSet`, `CobuildConversionFailed`, `UnderwriterSlashRouted`, `GoalSuperTokenUpgradeFailed`, `GoalSuperTokenForwardingFailed`, `GoalSuperTokenForwardingRetried`

## Common Table Touches

- Raw event audit table: `protocol_event` (scaffold handlers via helper).
- Keeper outbox stream: `keeper_outbox` (same helper path as `protocol_event`; replay-safe immutable inserts).
- Notification delivery outbox: `protocol_notification_outbox` (recipient-resolved immutable inbox intents for downstream worker materialization).
- Legacy handlers update legacy projection tables (`project`, `ruleset`, `loan`, payment/swap telemetry, and related maps).
- Domain tables are mapped in `ponder.schema.ts` and updated by same-domain handlers.
- Deterministic lookup/cursor tables (`budget_treasury_by_*`, `goal_treasuries_by_project`, `goal_context_by_budget_*`, `goal_stakeholder_audience`, `flow_recipient_by_index`, `sucker_group_by_address`, `goal_treasury_series_cursor`) are maintained in handler write paths to avoid non-PK SQL lookups.
