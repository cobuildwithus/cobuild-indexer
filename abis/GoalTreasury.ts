import { parseAbi } from "viem";

/**
 * Event ABI for GoalTreasury.
 * Generated from Foundry artifact in ../protocol/out.
 */
export const GoalTreasuryAbi = parseAbi([
  "event DonationRecorded(address indexed donor, address indexed sourceToken, uint256 sourceAmount, uint256 superTokenAmount, uint256 totalRaised)",
  "event FlowRateSyncCallFailed(address indexed flow, bytes4 indexed selector, int96 attemptedRate, bytes reason)",
  "event FlowRateSyncManualInterventionRequired(address indexed flow, int96 targetRate, int96 fallbackRate, int96 currentRate)",
  "event FlowRateSynced(int96 targetRate, int96 appliedRate, uint256 treasuryBalance, uint256 timeRemaining)",
  "event FlowRateZeroingFailed(address indexed flow, bytes reason)",
  "event GoalConfigured(address indexed owner, address flow, address stakeVault, address rewardEscrow, address hook, address goalRulesets, uint256 goalRevnetId, uint64 minRaiseDeadline, uint64 deadline, uint256 minRaise)",
  "event GoalFinalized(uint8 finalState)",
  "event HookDeferredFundingSettled(uint8 indexed finalState, uint256 superTokenAmount, uint256 rewardEscrowAmount, uint256 controllerBurnAmount)",
  "event HookFundingDeferred(address indexed sourceToken, uint256 sourceAmount, uint256 superTokenAmount, uint256 totalDeferredSuperTokenAmount)",
  "event HookFundingRecorded(uint256 amount, uint256 totalRaised)",
  "event Initialized(uint64 version)",
  "event JurorSlasherConfigured(address indexed authority, address indexed slasher)",
  "event ResidualSettled(uint8 indexed finalState, uint256 totalSettled, uint256 rewardEscrowAmount, uint256 controllerBurnAmount)",
  "event StateTransition(uint8 previousState, uint8 newState)",
  "event SuccessAssertionCleared(bytes32 indexed assertionId)",
  "event SuccessAssertionRegistered(bytes32 indexed assertionId, uint64 indexed assertedAt)",
  "event SuccessRewardsFinalized(uint64 successAt, uint64 finalizedAt)",
  "event TerminalSideEffectFailed(uint8 indexed operation, bytes reason)",
] as const);
