import { parseAbi } from "viem";

/**
 * Event ABI for BudgetTCRFactory.
 * Generated from Foundry artifact in ../protocol/out.
 */
export const BudgetTCRFactoryAbi = parseAbi([
  "event BudgetTCRStackDeployedForGoal(address indexed sender, address indexed budgetTCR, address indexed arbitrator, address token, address goalFlow, address goalTreasury)",
] as const);
