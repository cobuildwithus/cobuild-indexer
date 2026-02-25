import { parseAbi } from "viem";

/**
 * Event ABI for GoalFlowAllocationLedgerPipeline.
 * Generated from Foundry artifact in ../protocol/out.
 */
export const GoalFlowAllocationLedgerPipelineAbi = parseAbi([
  "event BudgetTreasurySyncAttempted(address indexed budgetTreasury, address parentFlow, address parentStrategy, uint256 parentAllocationKey, bool success)",
  "event ChildAllocationSyncAttempted(address indexed budgetTreasury, address indexed childFlow, address indexed strategy, uint256 allocationKey, address parentFlow, address parentStrategy, uint256 parentAllocationKey, bool success)",
  "event ChildAllocationSyncSkipped(address indexed budgetTreasury, address indexed childFlow, address parentFlow, address parentStrategy, uint256 parentAllocationKey, bytes32 reason)",
] as const);
