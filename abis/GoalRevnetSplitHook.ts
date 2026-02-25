import { parseAbi } from "viem";

/**
 * Event ABI for GoalRevnetSplitHook.
 * Generated from Foundry artifact in ../protocol/out.
 */
export const GoalRevnetSplitHookAbi = parseAbi([
  "event GoalFundingProcessed(uint256 indexed projectId, address indexed sourceToken, uint256 sourceAmount, uint256 superTokenAmount, bool accepted, uint8 action)",
  "event GoalSuccessSettlementProcessed(uint256 indexed projectId, address indexed sourceToken, uint256 sourceAmount, uint256 rewardEscrowAmount, uint256 burnAmount)",
  "event Initialized(uint64 version)",
] as const);
