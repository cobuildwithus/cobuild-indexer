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
  - `FlowInitialized`, `RecipientCreated`, `FlowRecipientCreated`, `RecipientRemoved`, `MetadataSet`
  - `FlowRateIncreased`, `FlowRateDecreased`, `FlowRateIncreaseNoop`
  - `TargetOutflowRateUpdated`, `TargetOutflowRefreshFailed`
  - `AllocationCommitted`, `SuperTokenSwept`

## Goal Treasury

- `GoalTreasury:*` handlers in `src/goals/**`
  - `GoalConfigured`, `StateTransition`, `GoalFinalized`
  - `SuccessAssertionRegistered`, `SuccessAssertionCleared`, `SuccessRewardsFinalized`
  - `DonationRecorded`, `FlowRateSynced`, `ResidualSettled`
  - `HookFundingRecorded`, `HookFundingDeferred`, `HookDeferredFundingSettled`
  - `JurorSlasherConfigured`, `TerminalSideEffectFailed`

## Budget Treasury

- `BudgetTreasury:*` handlers in `src/budgets/**`
  - `BudgetConfigured`, `StateTransition`, `BudgetFinalized`
  - `SuccessAssertionRegistered`, `SuccessAssertionCleared`, `SuccessResolutionDisabled`
  - `DonationRecorded`, `FlowRateSynced`, `ResidualSettled`, `TerminalSideEffectFailed`

## Stake and Jurors

- `GoalStakeVault:*` + `BudgetStakeVault:*` handlers in `src/stakeVault/**`
  - stake/withdraw totals, goal resolution, juror lifecycle/slashing/delegation
- `BudgetStakeLedger:*` handlers in `src/stakeLedger/**`
  - `BudgetRegistered`, `BudgetRemoved`, `AllocationCheckpointed`, `StakeLedgerFinalized`

## Reward Escrow

- `RewardEscrow:*` handlers in `src/rewardEscrow/**`
  - `RewardEscrowFinalized`, `Claimed`, `GoalSuperTokenUnwrapped`
  - `FailedRewardsSwept`, `FailedCobuildRewardsSwept`

## TCR and Factory

- `BudgetTCR:*` handlers in `src/tcr/**`
  - deploy/activation/removal/sync telemetry
- `BudgetTCRFactory:*` handlers in `src/tcrFactory/**`
  - deployment-for-goal telemetry

## Pipeline and Hook

- `GoalFlowAllocationLedgerPipeline:*` handlers in `src/pipeline/**`
- `GoalRevnetSplitHook:*` handlers in `src/hook/**`
- `SingleAllocatorStrategy:AllocatorChanged` in `src/strategy/**`

## Common Table Touches

- Raw event audit table: `protocol_event` (scaffold handlers via helper).
- Legacy handlers update legacy projection tables (`project`, `ruleset`, `loan`, payment/swap telemetry, and related maps).
- Domain tables are mapped in `ponder.schema.ts` and updated by same-domain handlers.
