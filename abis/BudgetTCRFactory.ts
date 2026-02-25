import { parseAbi } from "viem";

/** Minimal ABI for BudgetTCRFactory (events only). */
export const BudgetTCRFactoryAbi = parseAbi([
  "event BudgetTCRStackDeployedForGoal(address indexed goalFlow, address indexed goalTreasury, address indexed budgetTCR, address arbitrator, address stackDeployer, address budgetSuccessResolver)",
] as const);
