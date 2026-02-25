import { parseAbi } from "viem";
/** Minimal ABI for BudgetTCR (events only). */
export const BudgetTCRAbi = parseAbi([
    "event BudgetStackDeployed(bytes32 indexed itemID, address indexed childFlow, address indexed budgetTreasury, address stakeVault, address strategy)",
    "event BudgetStackActivationQueued(bytes32 indexed itemID, address indexed budgetTreasury)",
    "event BudgetStackRemovalQueued(bytes32 indexed itemID, address indexed budgetTreasury)",
    "event BudgetStackRemovalHandled(bytes32 indexed itemID, address indexed budgetTreasury, bool terminallyResolved)",
    "event BudgetStackTerminalizationRetried(bytes32 indexed itemID, address indexed budgetTreasury, bool terminallyResolved)",
    "event BudgetTreasuryBatchSyncAttempted(bytes32 indexed itemID, address indexed budgetTreasury, bool success)",
    "event BudgetTreasuryBatchSyncSkipped(bytes32 indexed itemID, address indexed budgetTreasury, uint8 reason)",
    "event BudgetTreasuryCallFailed(bytes32 indexed itemID, address indexed budgetTreasury, bytes4 selector, bytes reason)",
]);
