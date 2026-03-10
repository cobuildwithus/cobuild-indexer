import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import {
  budgetContextByMechanismArbitrator,
  budgetContextByMechanismTcr,
  budgetMechanismRegistry,
  budgetTreasury,
  budgetTreasuryByRecipient,
  goalContextByBudgetTcr,
} from "ponder:schema";

import { getGoalRow } from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetAllocationMechanismDeployed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const budgetTcr = event.log.address as Hex;
  const recipientId = event.args.itemID as Hex;
  const allocationMechanismTcr = event.args.allocationMechanism as Hex;
  const allocationMechanismArbitrator = event.args.allocationMechanismArbitrator as Hex;
  const roundFactory = event.args.roundFactory as Hex;

  const [goalContext, budgetLink] = await Promise.all([
    context.db.find(goalContextByBudgetTcr, { id: budgetTcr }),
    context.db.find(budgetTreasuryByRecipient, { id: recipientId }),
  ]);
  const budgetTreasuryId = (budgetLink?.budgetTreasury ?? null) as Hex | null;
  if (!goalContext?.goalTreasury || !budgetTreasuryId) return;

  const [goalRow, budgetRow] = await Promise.all([
    getGoalRow({
      context,
      goalTreasuryAddress: goalContext.goalTreasury,
    }),
    context.db.find(budgetTreasury, { id: budgetTreasuryId }),
  ]);
  if (!goalRow) return;

  const childFlow = (budgetRow?.childFlow ?? budgetLink?.childFlow ?? null) as Hex | null;
  const strategy = (budgetRow?.strategy ?? null) as Hex | null;
  const fundingEscrow = (budgetRow?.premiumEscrow ?? null) as Hex | null;

  await context.db
    .insert(budgetMechanismRegistry)
    .values({
      id: allocationMechanismTcr,
      goalTreasury: goalRow.id,
      budgetTreasury: budgetTreasuryId,
      stakeVault: goalRow.stakeVault,
      budgetTcr,
      recipientId,
      childFlow,
      strategy,
      fundingEscrow,
      allocationMechanismArbitrator,
      roundFactory,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: goalRow.id,
      budgetTreasury: budgetTreasuryId,
      stakeVault: goalRow.stakeVault,
      budgetTcr,
      recipientId,
      childFlow,
      strategy,
      fundingEscrow,
      allocationMechanismArbitrator,
      roundFactory,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(budgetContextByMechanismTcr)
    .values({
      id: allocationMechanismTcr,
      goalTreasury: goalRow.id,
      budgetTreasury: budgetTreasuryId,
      stakeVault: goalRow.stakeVault,
      budgetTcr,
      recipientId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: goalRow.id,
      budgetTreasury: budgetTreasuryId,
      stakeVault: goalRow.stakeVault,
      budgetTcr,
      recipientId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(budgetContextByMechanismArbitrator)
    .values({
      id: allocationMechanismArbitrator,
      allocationMechanismTcr,
      goalTreasury: goalRow.id,
      budgetTreasury: budgetTreasuryId,
      stakeVault: goalRow.stakeVault,
      budgetTcr,
      recipientId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      allocationMechanismTcr,
      goalTreasury: goalRow.id,
      budgetTreasury: budgetTreasuryId,
      stakeVault: goalRow.stakeVault,
      budgetTcr,
      recipientId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
