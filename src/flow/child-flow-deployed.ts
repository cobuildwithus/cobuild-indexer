import { and, eq } from "drizzle-orm";
import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import { budgetStack, budgetTreasury, flow, flowRecipient, premiumEscrow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalFlow:ChildFlowDeployed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalFlow" });

  const parentFlowId = event.log.address as Hex;
  const childFlowId = event.args.recipient as Hex;
  const recipientId = event.args.recipientId as Hex;
  const escrowId = event.args.managerRewardPool as Hex;

  await context.db.sql
    .update(flowRecipient)
    .set({
      isFlowRecipient: true,
      childStrategy: event.args.strategy,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(and(eq(flowRecipient.flowId, parentFlowId), eq(flowRecipient.recipientId, recipientId)));

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

  const [stackRow] = await context.db.sql
    .select({ budgetTreasury: budgetStack.budgetTreasury })
    .from(budgetStack)
    .where(eq(budgetStack.id, recipientId))
    .limit(1);

  await context.db
    .insert(premiumEscrow)
    .values({
      id: escrowId,
      budgetStackId: recipientId,
      childFlow: childFlowId,
      budgetTreasury: stackRow?.budgetTreasury ?? null,
      managerRewardPool: escrowId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      budgetStackId: recipientId,
      childFlow: childFlowId,
      budgetTreasury: stackRow?.budgetTreasury ?? null,
      managerRewardPool: escrowId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const [recipientTreasury] = await context.db.sql
    .select({ id: budgetTreasury.id })
    .from(budgetTreasury)
    .where(eq(budgetTreasury.recipientId, recipientId))
    .limit(1);

  let treasuryId = recipientTreasury?.id ?? null;
  if (!treasuryId) {
    const [childFlowTreasury] = await context.db.sql
      .select({ id: budgetTreasury.id })
      .from(budgetTreasury)
      .where(eq(budgetTreasury.childFlow, childFlowId))
      .limit(1);
    treasuryId = childFlowTreasury?.id ?? null;
  }

  if (treasuryId) {
    await context.db.sql
      .update(budgetTreasury)
      .set({
        recipientId,
        childFlow: childFlowId,
        premiumEscrow: escrowId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .where(eq(budgetTreasury.id, treasuryId));

    await context.db
      .insert(premiumEscrow)
      .values({
        id: escrowId,
        budgetStackId: recipientId,
        childFlow: childFlowId,
        budgetTreasury: treasuryId,
        managerRewardPool: escrowId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        budgetStackId: recipientId,
        childFlow: childFlowId,
        budgetTreasury: treasuryId,
        managerRewardPool: escrowId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });
  }
});
