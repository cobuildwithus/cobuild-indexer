import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import {
  budgetStack,
  budgetTreasury,
  budgetTreasuryByChildFlow,
  budgetTreasuryByRecipient,
  flow,
  flowRecipient,
  premiumEscrow,
  premiumEscrowByBudgetTreasury,
} from "ponder:schema";

import { flowRecipientKey } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetStackDeployed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const recipientId = event.args.itemID as Hex;
  const childFlowId = event.args.childFlow as Hex;
  const budgetTreasuryId = event.args.budgetTreasury as Hex;
  const childFlow = await context.db.find(flow, { id: childFlowId });
  const existingStack = await context.db.find(budgetStack, { id: recipientId });
  const premiumEscrowAddress = (existingStack?.premiumEscrow ??
    childFlow?.managerRewardPool ??
    null) as Hex | null;

  await context.db
    .insert(budgetStack)
    .values({
      id: recipientId,
      childFlow: childFlowId,
      budgetTreasury: budgetTreasuryId,
      premiumEscrow: premiumEscrowAddress,
      strategy: event.args.strategy,
      status: "DEPLOYED",
      deployedAtBlock: event.block.number,
      deployedAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      childFlow: childFlowId,
      budgetTreasury: budgetTreasuryId,
      premiumEscrow: premiumEscrowAddress,
      strategy: event.args.strategy,
      status: "DEPLOYED",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(budgetTreasury)
    .values({
      id: budgetTreasuryId,
      recipientId,
      childFlow: childFlowId,
      premiumEscrow: premiumEscrowAddress,
      strategy: event.args.strategy,
      finalized: false,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      recipientId,
      childFlow: childFlowId,
      premiumEscrow: premiumEscrowAddress,
      strategy: event.args.strategy,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(budgetTreasuryByRecipient)
    .values({
      id: recipientId,
      budgetTreasury: budgetTreasuryId,
      childFlow: childFlowId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      budgetTreasury: budgetTreasuryId,
      childFlow: childFlowId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(budgetTreasuryByChildFlow)
    .values({
      id: childFlowId,
      budgetTreasury: budgetTreasuryId,
      recipientId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      budgetTreasury: budgetTreasuryId,
      recipientId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  if (childFlow?.parentFlow) {
    const parentRecipientId = flowRecipientKey(childFlow.parentFlow as Hex, recipientId);
    await context.db.update(flowRecipient, { id: parentRecipientId }).set({
      budgetTreasury: budgetTreasuryId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
  }

  if (premiumEscrowAddress) {
    await context.db
      .insert(premiumEscrow)
      .values({
        id: premiumEscrowAddress,
        budgetStackId: recipientId,
        childFlow: childFlowId,
        budgetTreasury: budgetTreasuryId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        budgetStackId: recipientId,
        childFlow: childFlowId,
        budgetTreasury: budgetTreasuryId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });

    await context.db
      .insert(premiumEscrowByBudgetTreasury)
      .values({
        id: budgetTreasuryId,
        premiumEscrow: premiumEscrowAddress,
        budgetStackId: recipientId,
        childFlow: childFlowId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        premiumEscrow: premiumEscrowAddress,
        budgetStackId: recipientId,
        childFlow: childFlowId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });
  }
});
