import { parseAbi } from "viem";

/**
 * Event ABI for BudgetTreasury.
 * Generated from Foundry artifact in ../protocol/out.
 */
export const BudgetTreasuryAbi = parseAbi([
  "event BudgetConfigured(address indexed controller, address flow, address stakeVault, uint64 fundingDeadline, uint64 executionDuration, uint256 activationThreshold, uint256 runwayCap)",
  "event BudgetFinalized(uint8 finalState)",
  "event DonationRecorded(address indexed donor, address indexed sourceToken, uint256 sourceAmount, uint256 superTokenAmount)",
  "event FlowRateSyncCallFailed(address indexed flow, bytes4 indexed selector, int96 attemptedRate, bytes reason)",
  "event FlowRateSyncManualInterventionRequired(address indexed flow, int96 targetRate, int96 fallbackRate, int96 currentRate)",
  "event FlowRateSynced(int96 targetRate, int96 appliedRate, uint256 treasuryBalance, uint256 timeRemaining)",
  "event FlowRateZeroingFailed(address indexed flow, bytes reason)",
  "event Initialized(uint64 version)",
  "event ReassertGraceActivated(bytes32 indexed clearedAssertionId, uint64 indexed graceDeadline)",
  "event ResidualSettled(address indexed destination, uint256 amount)",
  "event StateTransition(uint8 previousState, uint8 newState)",
  "event SuccessAssertionCleared(bytes32 indexed assertionId)",
  "event SuccessAssertionRegistered(bytes32 indexed assertionId, uint64 indexed assertedAt)",
  "event SuccessResolutionDisabled()",
  "event TerminalSideEffectFailed(uint8 indexed operation, bytes reason)",
] as const);
