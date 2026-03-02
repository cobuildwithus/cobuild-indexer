import { parseAbi } from "viem";

/**
 * Event ABI for BudgetStakeLedger.
 * Generated from Foundry artifact in ../v1-core/out.
 */
export const BudgetStakeLedgerAbi = parseAbi([
  "event AllocationCheckpointed(address indexed account, address indexed budget, uint256 allocatedStake, uint64 checkpointTime)",
  "event BudgetRegistered(bytes32 indexed recipientId, address indexed budget)",
  "event BudgetRemoved(bytes32 indexed recipientId, address indexed budget)",
] as const);
