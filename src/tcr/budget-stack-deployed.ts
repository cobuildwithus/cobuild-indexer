import { eq } from "drizzle-orm";
import { ponder } from "ponder:registry";
import { budgetStack, budgetTreasury, premiumEscrow } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetStackDeployed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const stackRows = await context.db.sql
    .select({ premiumEscrow: budgetStack.premiumEscrow })
    .from(budgetStack)
    .where(eq(budgetStack.id, event.args.itemID))
    .limit(1);

  const premiumEscrowAddress = stackRows[0]?.premiumEscrow ?? null;

  await context.db
    .insert(budgetStack)
    .values({
      id: event.args.itemID,
      childFlow: event.args.childFlow,
      budgetTreasury: event.args.budgetTreasury,
      premiumEscrow: premiumEscrowAddress,
      strategy: event.args.strategy,
      status: "DEPLOYED",
      deployedAtBlock: event.block.number,
      deployedAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      childFlow: event.args.childFlow,
      budgetTreasury: event.args.budgetTreasury,
      premiumEscrow: premiumEscrowAddress,
      strategy: event.args.strategy,
      status: "DEPLOYED",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(budgetTreasury)
    .values({
      id: event.args.budgetTreasury,
      recipientId: event.args.itemID,
      childFlow: event.args.childFlow,
      premiumEscrow: premiumEscrowAddress,
      strategy: event.args.strategy,
      finalized: false,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      recipientId: event.args.itemID,
      childFlow: event.args.childFlow,
      premiumEscrow: premiumEscrowAddress,
      strategy: event.args.strategy,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  if (premiumEscrowAddress) {
    await context.db
      .insert(premiumEscrow)
      .values({
        id: premiumEscrowAddress,
        budgetStackId: event.args.itemID,
        childFlow: event.args.childFlow,
        budgetTreasury: event.args.budgetTreasury,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        budgetStackId: event.args.itemID,
        childFlow: event.args.childFlow,
        budgetTreasury: event.args.budgetTreasury,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });
  }
});
