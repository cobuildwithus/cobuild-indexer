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
- `JBRulesets:*` in `src/contracts/jb-ruleset/**`
  - `RulesetQueued`, `RulesetInitialized`
- `JBProjects:Create` in `src/contracts/jb-projects/create.ts`
- `JBSuckersRegistry:SuckerDeployedFor` in `src/contracts/jb-suckers-registry/**`
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
  - `JurorSlasherConfigured`, `UnderwriterSlasherConfigured`, `TerminalSideEffectFailed`

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

## TCR and Factory

- `BudgetTCR:*` handlers in `src/tcr/**`
  - deploy/activation/removal/sync telemetry
  - allocation mechanism/credit cap/terminal recipient telemetry
  - governance/Kleros telemetry (`Initialized`, `RequestSubmitted`, `RequestEvidenceGroupID`, `MetaEvidence`, `Evidence`, `Dispute`, `Ruling`, `ItemSubmitted`, `ItemStatusChange`)
  - funding/terminalization telemetry (`SubmissionDepositPaid`, `SubmissionDepositTransferred`, `BudgetTerminalizationStepFailed`)
- `BudgetTCRFactory:*` handlers in `src/tcrFactory/**`
  - deployment-for-goal telemetry

## Pipeline and Hook

- `GoalFlowAllocationLedgerPipeline:*` handlers in `src/pipeline/**`
  - child allocation sync attempt/skip telemetry
- `GoalRevnetSplitHook:*` handlers in `src/hook/**`
  - `Initialized`, `GoalFundingProcessed`, `GoalSuccessSettlementProcessed`

## Common Table Touches

- Raw event audit table: `protocol_event` (scaffold handlers via helper).
- Legacy handlers update legacy projection tables (`project`, `ruleset`, `loan`, payment/swap telemetry, and related maps).
- Domain tables are mapped in `ponder.schema.ts` and updated by same-domain handlers.
