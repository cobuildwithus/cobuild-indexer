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
} from "ponder:schema";
import { flowRecipientKey } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalFlow:ChildFlowDeployed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalFlow" });

  const parentFlowId = event.log.address as Hex;
  const childFlowId = event.args.recipient as Hex;
  const recipientId = event.args.recipientId as Hex;
  const escrowId = event.args.managerRewardPool as Hex;
  const recipientRowId = flowRecipientKey(parentFlowId, recipientId);

  const recipientBudgetLink = await context.db.find(budgetTreasuryByRecipient, { id: recipientId });
  const childFlowBudgetLink = await context.db.find(budgetTreasuryByChildFlow, { id: childFlowId });
  const treasuryId = recipientBudgetLink?.budgetTreasury ?? childFlowBudgetLink?.budgetTreasury ?? null;

  await context.db.update(flowRecipient, { id: recipientRowId }).set({
    isFlowRecipient: true,
    childStrategy: event.args.strategy,
    ...(treasuryId ? { budgetTreasury: treasuryId } : {}),
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });

  await context.db
    .insert(flow)
    .values({
      id: childFlowId,
      kind: "child",
      parentFlow: parentFlowId,
      initialOwner: event.args.recipientAdmin,
      flowOperator: event.args.flowOperator,
      sweeper: event.args.sweeper,
      managerRewardPool: escrowId,
      strategy: event.args.strategy,
      currentFlowRate: 0n,
      targetOutflowRate: 0n,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      kind: "child",
      parentFlow: parentFlowId,
      initialOwner: event.args.recipientAdmin,
      flowOperator: event.args.flowOperator,
      sweeper: event.args.sweeper,
      managerRewardPool: escrowId,
      strategy: event.args.strategy,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(budgetStack)
    .values({
      id: recipientId,
      childFlow: childFlowId,
      premiumEscrow: escrowId,
      strategy: event.args.strategy,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      childFlow: childFlowId,
      premiumEscrow: escrowId,
      strategy: event.args.strategy,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(premiumEscrow)
    .values({
      id: escrowId,
      budgetStackId: recipientId,
      childFlow: childFlowId,
      ...(treasuryId ? { budgetTreasury: treasuryId } : {}),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      budgetStackId: recipientId,
      childFlow: childFlowId,
      ...(treasuryId ? { budgetTreasury: treasuryId } : {}),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  if (!treasuryId) return;

  await context.db.update(budgetTreasury, { id: treasuryId }).set({
    recipientId,
    childFlow: childFlowId,
    premiumEscrow: escrowId,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });

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
});
