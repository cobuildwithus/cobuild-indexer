import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import {
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

ponder.on("BudgetTreasury:BudgetConfigured", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });

  const treasuryId = event.log.address as Hex;
  const childFlowId = event.args.flow as Hex;
  const existingBudget = await context.db.find(budgetTreasury, { id: treasuryId });
  const childFlowLink = await context.db.find(budgetTreasuryByChildFlow, { id: childFlowId });
  const childFlow = await context.db.find(flow, { id: childFlowId });
  const recipientId = (existingBudget?.recipientId ?? childFlowLink?.recipientId ?? null) as
    | Hex
    | null;
  const premiumEscrowAddress = (existingBudget?.premiumEscrow ??
    childFlow?.managerRewardPool ??
    null) as Hex | null;

  await context.db
    .insert(budgetTreasury)
    .values({
      id: treasuryId,
      controller: event.args.controller,
      recipientId,
      childFlow: childFlowId,
      premiumEscrow: premiumEscrowAddress,
      fundingDeadline: event.args.fundingDeadline,
      executionDuration: event.args.executionDuration,
      activationThreshold: event.args.activationThreshold,
      runwayCap: event.args.runwayCap,
      state: null,
      finalized: false,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      controller: event.args.controller,
      recipientId,
      childFlow: childFlowId,
      premiumEscrow: premiumEscrowAddress,
      fundingDeadline: event.args.fundingDeadline,
      executionDuration: event.args.executionDuration,
      activationThreshold: event.args.activationThreshold,
      runwayCap: event.args.runwayCap,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(budgetTreasuryByChildFlow)
    .values({
      id: childFlowId,
      budgetTreasury: treasuryId,
      recipientId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      budgetTreasury: treasuryId,
      recipientId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  if (premiumEscrowAddress) {
    await context.db
      .insert(premiumEscrow)
      .values({
        id: premiumEscrowAddress,
        ...(recipientId ? { budgetStackId: recipientId } : {}),
        childFlow: childFlowId,
        budgetTreasury: treasuryId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        ...(recipientId ? { budgetStackId: recipientId } : {}),
        childFlow: childFlowId,
        budgetTreasury: treasuryId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });

    await context.db
      .insert(premiumEscrowByBudgetTreasury)
      .values({
        id: treasuryId,
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

  if (!recipientId) return;

  await context.db
    .insert(budgetTreasuryByRecipient)
    .values({
      id: recipientId,
      budgetTreasury: treasuryId,
      childFlow: childFlowId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      budgetTreasury: treasuryId,
      childFlow: childFlowId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  if (!childFlow?.parentFlow) return;

  await context.db.update(flowRecipient, { id: flowRecipientKey(childFlow.parentFlow as Hex, recipientId) }).set({
    budgetTreasury: treasuryId,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });
});
