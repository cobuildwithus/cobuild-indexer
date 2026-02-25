import type { Context } from "ponder:registry";
import { cashoutCoefficientSnapshot, project, ruleset } from "ponder:schema";

const MAX_TAX = 10_000n;
const WAD = 1_000_000_000_000_000_000n; // 1 × 10¹⁸
const WAD2 = WAD * WAD; // 1 × 10³⁶ – for B only

/**
 * Cash-out values depend on three project-level variables:
 * - overflow: changes when someone pays, adds, redeems, or distributes funds.
 * - totalSupply: changes when tokens are minted or burned.
 * - tax: changes when a new ruleset becomes active.
 *
 * To efficiently handle recalculations, we exploit algebra to rewrite the cash-out formula as:
 * cashOutValue = A * balance + B * balance^2
 *
 * Where:
 * A = overflow * (MAX_TAX - tax) / MAX_TAX / totalSupply
 * B = overflow * tax / MAX_TAX / (totalSupply ** 2)
 *
 * By precomputing and storing these two coefficients (A and B) per project,
 * we minimize recalculation overhead for read-time cash-out computations.
 */

/**
 * Calculate cashout coefficient A with 18-decimal scaling for precision.
 * A = (overflow * (MAX_TAX - tax) * WAD) / (MAX_TAX * totalSupply)
 */
export const calculateCashoutA = (
  overflow: bigint,
  tax: bigint,
  totalSupply: bigint
): bigint => {
  if (totalSupply === 0n) return 0n;
  return (overflow * (MAX_TAX - tax) * WAD) / (MAX_TAX * totalSupply);
};

/**
 * Calculate cashout coefficient B with 36-decimal scaling for precision.
 * B = (overflow * tax * WAD2) / (MAX_TAX * totalSupply^2)
 */
export const calculateCashoutB = (
  overflow: bigint,
  tax: bigint,
  totalSupply: bigint
): bigint => {
  if (totalSupply === 0n) return 0n;
  return (overflow * tax * WAD2) / (MAX_TAX * totalSupply * totalSupply);
};

/**
 * Recalculate and update cashout coefficients (A and B) for a given project.
 * Updates the project's cashout__A and cashout__B fields in the database.
 */
export async function refreshProjectCashoutCoefficients({
  db,
  chainId,
  projectId,
  snapshot,
}: {
  db: Context["db"];
  chainId: number;
  projectId: number;
  snapshot?: { timestamp: number; txHash: `0x${string}` };
}) {
  const currentProject = await db.find(project, {
    chainId,
    projectId,
  });

  if (!currentProject) {
    throw new Error(`Project ${projectId} not found on chain ${chainId}`);
  }

  const currentRuleset = await db.find(ruleset, {
    chainId,
    rulesetId: currentProject.currentRulesetId,
    projectId,
  });

  if (!currentRuleset) {
    throw new Error(
      `Ruleset ${currentProject.currentRulesetId} not found for project ${projectId} on chain ${chainId}`
    );
  }

  const overflow = currentProject.balance;
  const tax = BigInt(currentRuleset.cashOutTaxRate);

  const totalSupplyWithPending =
    currentProject.erc20Supply + currentProject.pendingReservedTokens;

  const A = calculateCashoutA(overflow, tax, totalSupplyWithPending);
  const B = calculateCashoutB(overflow, tax, totalSupplyWithPending);

  // Update the project's cashout coefficients in the database
  await db
    .update(project, {
      chainId,
      projectId,
    })
    .set({
      cashout__A: A,
      cashout__B: B,
    });

  if (snapshot && currentProject.suckerGroupId) {
    await db.insert(cashoutCoefficientSnapshot).values({
      chainId,
      projectId,
      suckerGroupId: currentProject.suckerGroupId,
      timestamp: snapshot.timestamp,
      txHash: snapshot.txHash,
      cashoutA: A,
      cashoutB: B,
      balance: overflow,
      totalSupply: totalSupplyWithPending,
      cashOutTaxRate: Number(currentRuleset.cashOutTaxRate),
    });
  }

}
