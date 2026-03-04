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
- `FlowActualRateRefresh:block` handler in `src/flow/actual-flow-rate-refresh.ts`
  - deterministic block cron projection refresh for `flow.currentFlowRate` via `IFlow.getActualFlowRate()` on queued flow addresses.
  - round-robin queue state is maintained in `flow_actual_rate_refresh_state` and enqueue hooks in `FlowInitialized`, `ChildFlowDeployed`, and `FlowRecipientCreated`.
  - writes freshness/error telemetry fields (`currentFlowRateObservedAt*`, `currentFlowRateStale`, failure count/reason) on `flow`.
- Dynamic factory discovery in `ponder.config.ts`
  - `ChildFlow` addresses: `GoalFlow:ChildFlowDeployed(recipient)`
  - `PremiumEscrow` addresses: `GoalFlow:ChildFlowDeployed(managerRewardPool)`

## Goal Treasury

- `GoalTreasury:*` handlers in `src/goals/**`
  - `Initialized`, `GoalConfigured`, `StateTransition`, `GoalFinalized`
  - `SuccessAssertionRegistered`, `SuccessAssertionCleared`, `SuccessAssertionResolutionFailClosed`
  - `DonationRecorded`, `FlowRateSynced`, `FlowRateSyncManualInterventionRequired`, `FlowRateZeroingFailed`, `FlowRateSyncCallFailed`
  - `ReassertGraceActivated`, `ResidualSettled`
  - `HookFundingRecorded`, `HookFundingDeferred`, `HookDeferredFundingSettled`
  - `TerminalSideEffectFailed`
  - `GoalConfigured` also writes canonical project + canonical route linkage fields on `goal_treasury`.
  - `GoalConfigured` also maintains deterministic `goal_treasuries_by_project` KV rows keyed by `${chainId}-${projectId}`.
  - `GoalConfigured` persists event-provided `jurorSlasher`, `underwriterSlasher`, `successResolver`, `goalToken`, and `cobuildToken`, and links `parentFlow`/`strategy` from the existing `flow` row.
  - `FlowRateSynced` also writes `goal_treasury_series` + `goal_treasury_series_cursor`.

## Budget Treasury

- `BudgetTreasury:*` handlers in `src/budgets/**`
  - `Initialized`, `BudgetConfigured`, `StateTransition`, `BudgetFinalized`
  - `SuccessAssertionRegistered`, `SuccessAssertionCleared`, `SuccessAssertionResolutionFailClosed`, `SuccessResolutionDisabled`
  - `DonationRecorded`, `FlowRateSynced`, `FlowRateSyncManualInterventionRequired`, `FlowRateZeroingFailed`, `FlowRateSyncCallFailed`
  - `ReassertGraceActivated`, `ResidualSettled`, `TerminalSideEffectFailed`

## Stake and Jurors

- `GoalStakeVault:*` handlers in `src/stakeVault/**`
  - stake/withdraw totals, goal resolution, juror lifecycle/slashing/delegation, underwriter slashing telemetry
  - includes `AllocationSyncFailed` telemetry
- `BudgetStakeLedger:*` handlers in `src/stakeLedger/**`
  - `BudgetRegistered`, `BudgetRemoved`, `AllocationCheckpointed`

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
  - `BudgetStackDeployed` maintains deterministic recipient/childFlow -> budget treasury lookup KV tables and recipient FK linkage.
- `BudgetTCRFactory:*` handlers in `src/tcrFactory/**`
  - deployment-for-goal telemetry
- `GoalFactory:GoalDeployed` handler in `src/goalFactory/goal-deployed.ts`
  - writes `goal_factory_deployment` rows keyed by `${chainId}:${goalRevnetId}` with emitted stack addresses (including router/resolver addresses).

## Pipeline and Hook

- `GoalFlowAllocationLedgerPipeline:*` handlers in `src/pipeline/**`
  - child allocation sync attempt/skip telemetry
  - raw telemetry only: `ChildAllocationSyncFailed`, `ChildSyncDebtOpened`, `ChildSyncDebtCleared`
- `GoalRevnetSplitHook:*` handlers in `src/hook/**`
  - `Initialized`, `GoalFundingProcessed`, `GoalSuccessSettlementProcessed`

## Resolver and Routers

- `UMATreasurySuccessResolver:*` handlers in `src/umaResolver/**`
  - raw telemetry only: `SuccessAssertionRequested`, `SuccessAssertionDisputed`, `SuccessAssertionResolved`, `SuccessAssertionFinalized`
- `JurorSlasherRouter:*` handlers in `src/jurorSlasherRouter/**`
  - raw telemetry only: `SlasherAuthorizationSet`
- `UnderwriterSlasherRouter:*` handlers in `src/underwriterSlasherRouter/**`
  - raw telemetry only: `PremiumEscrowAuthorizationSet`, `CobuildConversionFailed`, `UnderwriterSlashRouted`, `GoalSuperTokenUpgradeFailed`, `GoalSuperTokenForwardingFailed`, `GoalSuperTokenForwardingRetried`

## Common Table Touches

- Raw event audit table: `protocol_event` (scaffold handlers via helper).
- Legacy handlers update legacy projection tables (`project`, `ruleset`, `loan`, payment/swap telemetry, and related maps).
- Domain tables are mapped in `ponder.schema.ts` and updated by same-domain handlers.
- Deterministic lookup/cursor tables (`budget_treasury_by_*`, `goal_treasuries_by_project`, `flow_recipient_by_index`, `sucker_group_by_address`, `goal_treasury_series_cursor`) are maintained in handler write paths to avoid non-PK SQL lookups.
