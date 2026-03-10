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
import { queueFlowForActualRateRefresh } from "../helpers/flowRefresh";

ponder.on("GoalFlow:ChildFlowDeployed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalFlow" });

  const parentFlowId = event.log.address as Hex;
  const childFlowId = event.args.recipient as Hex;
  const recipientId = event.args.recipientId as Hex;
  const escrowId = event.args.managerRewardPool as Hex;
  const recipientRowId = flowRecipientKey(parentFlowId, recipientId);
  const updatedAt = {
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  };

  const [recipientBudgetLink, childFlowBudgetLink] = await Promise.all([
    context.db.find(budgetTreasuryByRecipient, { id: recipientId }),
    context.db.find(budgetTreasuryByChildFlow, { id: childFlowId }),
  ]);
  const treasuryId = recipientBudgetLink?.budgetTreasury ?? childFlowBudgetLink?.budgetTreasury ?? null;

  await context.db.update(flowRecipient, { id: recipientRowId }).set({
    isFlowRecipient: true,
    childStrategy: event.args.strategy,
    ...(treasuryId ? { budgetTreasury: treasuryId } : {}),
    ...updatedAt,
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
      ...updatedAt,
    })
    .onConflictDoUpdate({
      kind: "child",
      parentFlow: parentFlowId,
      initialOwner: event.args.recipientAdmin,
      flowOperator: event.args.flowOperator,
      sweeper: event.args.sweeper,
      managerRewardPool: escrowId,
      strategy: event.args.strategy,
      ...updatedAt,
    });

  await queueFlowForActualRateRefresh({
    context,
    event,
    flowId: childFlowId,
  });

  await context.db
    .insert(budgetStack)
    .values({
      id: recipientId,
      childFlow: childFlowId,
      premiumEscrow: escrowId,
      strategy: event.args.strategy,
      ...updatedAt,
    })
    .onConflictDoUpdate({
      childFlow: childFlowId,
      premiumEscrow: escrowId,
      strategy: event.args.strategy,
      ...updatedAt,
    });

  await context.db
    .insert(premiumEscrow)
    .values({
      id: escrowId,
      budgetStackId: recipientId,
      childFlow: childFlowId,
      ...(treasuryId ? { budgetTreasury: treasuryId } : {}),
      ...updatedAt,
    })
    .onConflictDoUpdate({
      budgetStackId: recipientId,
      childFlow: childFlowId,
      ...(treasuryId ? { budgetTreasury: treasuryId } : {}),
      ...updatedAt,
    });

  if (!treasuryId) return;

  await context.db.update(budgetTreasury, { id: treasuryId }).set({
    recipientId,
    childFlow: childFlowId,
    premiumEscrow: escrowId,
    ...updatedAt,
  });

  await context.db
    .insert(budgetTreasuryByRecipient)
    .values({
      id: recipientId,
      budgetTreasury: treasuryId,
      childFlow: childFlowId,
      ...updatedAt,
    })
    .onConflictDoUpdate({
      budgetTreasury: treasuryId,
      childFlow: childFlowId,
      ...updatedAt,
    });

  await context.db
    .insert(budgetTreasuryByChildFlow)
    .values({
      id: childFlowId,
      budgetTreasury: treasuryId,
      recipientId,
      ...updatedAt,
    })
    .onConflictDoUpdate({
      budgetTreasury: treasuryId,
      recipientId,
      ...updatedAt,
    });

  await context.db
    .insert(premiumEscrowByBudgetTreasury)
    .values({
      id: treasuryId,
      premiumEscrow: escrowId,
      budgetStackId: recipientId,
      childFlow: childFlowId,
      ...updatedAt,
    })
    .onConflictDoUpdate({
      premiumEscrow: escrowId,
      budgetStackId: recipientId,
      childFlow: childFlowId,
      ...updatedAt,
    });
});
