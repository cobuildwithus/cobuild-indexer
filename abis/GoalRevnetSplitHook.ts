import { parseAbi } from "viem";

/**
 * Event ABI for GoalRevnetSplitHook.
 * Generated from Foundry artifact in ../v1-core/out.
 */
export const GoalRevnetSplitHookAbi = parseAbi([
  "event GoalFundingProcessed(uint256 indexed projectId, address indexed sourceToken, uint256 sourceAmount, uint256 superTokenAmount, bool accepted, uint8 action)",
  "event GoalSuccessSettlementProcessed(uint256 indexed projectId, address indexed sourceToken, uint256 sourceAmount, uint256 burnAmount)",
  "event Initialized(uint64 version)",
] as const);
