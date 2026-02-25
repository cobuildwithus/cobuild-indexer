import { parseAbi } from "viem";
/** Minimal ABI for BudgetStakeLedger (events only). */
export const BudgetStakeLedgerAbi = parseAbi([
    "event StakeLedgerFinalized()",
    "event AllocationCheckpointed(bytes32 indexed budgetId, uint256 indexed allocationKey, uint256 allocation, uint256 timestamp, address caller)",
    "event BudgetRegistered(bytes32 indexed budgetId, address indexed budgetTreasury)",
    "event BudgetRemoved(bytes32 indexed budgetId, address indexed budgetTreasury)",
]);
