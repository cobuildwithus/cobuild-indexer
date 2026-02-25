import { parseAbi } from "viem";
/** Minimal ABI for GoalFlowAllocationLedgerPipeline (events only). */
export const GoalFlowAllocationLedgerPipelineAbi = parseAbi([
    "event ChildAllocationSyncAttempted(bytes32 indexed childRecipientId, address indexed childFlow, bytes32 parentRecipientId, address parentFlow, address indexed parentStrategy, uint256 parentAllocationKey, bytes32 commitment, uint256 weight, uint256 childAllocationKey, bool success)",
    "event ChildAllocationSyncSkipped(bytes32 indexed childRecipientId, address indexed childFlow, bytes32 parentRecipientId, address parentFlow, address indexed parentStrategy, uint256 parentAllocationKey, uint8 reason)",
    "event BudgetTreasurySyncAttempted(bytes32 indexed parentRecipientId, address indexed budgetTreasury, address parentFlow, address indexed parentStrategy, uint256 parentAllocationKey, bool success)",
]);
