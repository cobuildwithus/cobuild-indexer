import { parseAbi } from "viem";

/** Minimal ABI for BudgetTreasury (events only). */
export const BudgetTreasuryAbi = parseAbi([
  "event BudgetConfigured(bytes32 indexed recipientId, address childFlow, address indexed budgetOwner, address goalToken, address cobuildToken, address indexed stakeVault, address strategy, uint64 budgetStart, uint64 budgetDuration)",
  "event DonationRecorded(address indexed donor, uint256 amount, address indexed token, bytes32 memo, bytes metadata)",
  "event FlowRateSynced(uint256 weight, int96 oldFlowRate, int96 newFlowRate, address caller)",
  "event StateTransition(uint8 indexed fromState, uint8 indexed toState)",
  "event BudgetFinalized()",
  "event TerminalSideEffectFailed(bytes4 selector, bytes reason)",
  "event ResidualSettled(uint256 amount, address indexed token, address indexed beneficiary)",
  "event SuccessAssertionRegistered(bytes32 indexed itemID, bytes32 assertionId)",
  "event SuccessAssertionCleared(bytes32 indexed itemID, bytes32 assertionId)",
  "event SuccessResolutionDisabled()",
] as const);
