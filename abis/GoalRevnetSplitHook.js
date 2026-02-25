import { parseAbi } from "viem";
/** Minimal ABI for GoalRevnetSplitHook (events only). */
export const GoalRevnetSplitHookAbi = parseAbi([
    "event GoalFundingProcessed(bytes32 indexed recipientId, address indexed caller, uint256 amount, address indexed token)",
    "event GoalSuccessSettlementProcessed(bytes32 indexed recipientId, address indexed caller, uint256 amount, address indexed token, address beneficiary, bool succeeded)",
]);
