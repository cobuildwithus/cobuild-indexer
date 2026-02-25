import { ponder } from "ponder:registry";
import { and, eq } from "drizzle-orm";
import type { Hex } from "viem";

import { flow, flowRecipient } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalFlow:ChildFlowDeployed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalFlow" });

  const parentFlowId = event.log.address as Hex;
  const childFlowId = event.args.recipient as Hex;
  const recipientId = event.args.recipientId as Hex;

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
      managerRewardPool: event.args.managerRewardPool,
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
      managerRewardPool: event.args.managerRewardPool,
      strategy: event.args.strategy,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
