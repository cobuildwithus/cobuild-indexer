import { parseAbi } from "viem";

/**
 * Event ABI for GoalTreasury.
 * Generated from Foundry artifact in ../v1-core/out.
 */
export const GoalTreasuryAbi = parseAbi([
  "event DonationRecorded(address indexed donor, address indexed sourceToken, uint256 sourceAmount, uint256 superTokenAmount, uint256 totalRaised)",
  "event FlowRateSyncCallFailed(address indexed flow, bytes4 indexed selector, int96 attemptedRate, bytes reason)",
  "event FlowRateSyncManualInterventionRequired(address indexed flow, int96 targetRate, int96 fallbackRate, int96 currentRate)",
  "event FlowRateSynced(int96 targetRate, int96 appliedRate, uint256 treasuryBalance, uint256 timeRemaining)",
  "event FlowRateZeroingFailed(address indexed flow, bytes reason)",
  "event GoalConfigured(address indexed owner, address flow, address stakeVault, address budgetStakeLedger, address hook, address goalRulesets, uint256 goalRevnetId, uint64 minRaiseDeadline, uint64 deadline, uint256 minRaise)",
  "event GoalFinalized(uint8 finalState)",
  "event HookDeferredFundingSettled(uint8 indexed finalState, uint256 superTokenAmount, uint256 controllerBurnAmount)",
  "event HookFundingDeferred(address indexed sourceToken, uint256 sourceAmount, uint256 superTokenAmount, uint256 totalDeferredSuperTokenAmount)",
  "event HookFundingRecorded(uint256 amount, uint256 totalRaised)",
  "event Initialized(uint64 version)",
  "event JurorSlasherConfigured(address indexed authority, address indexed slasher)",
  "event ReassertGraceActivated(bytes32 indexed clearedAssertionId, uint64 indexed graceDeadline)",
  "event ResidualSettled(uint8 indexed finalState, uint256 totalSettled, uint256 controllerBurnAmount)",
  "event StateTransition(uint8 previousState, uint8 newState)",
  "event SuccessAssertionCleared(bytes32 indexed assertionId)",
  "event SuccessAssertionRegistered(bytes32 indexed assertionId, uint64 indexed assertedAt)",
  "event SuccessAssertionResolutionFailClosed(bytes32 indexed assertionId, uint8 indexed reason)",
  "event TerminalSideEffectFailed(uint8 indexed operation, bytes reason)",
  "event UnderwriterSlasherConfigured(address indexed authority, address indexed slasher)",
] as const);
