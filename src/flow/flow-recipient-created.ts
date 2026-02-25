import { ponder } from "ponder:registry";
import { and, eq } from "drizzle-orm";
import type { Hex } from "viem";

import { flow, flowRecipient } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleFlowRecipientCreated(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const parentFlowId: Hex = event.log.address;
  const recipientId: Hex = event.args.recipientId;
  const childFlowAddress: Hex = event.args.recipient;

  const fr = event.args.flowRecipient;

  // 1) Mark the (already-created) recipient row as a flow-recipient.
  await context.db.sql
    .update(flowRecipient)
    .set({
      isFlowRecipient: true,
      childDistributionPool: fr.distributionPool,
      childStrategy: fr.strategy,
      childManagerRewardPoolFlowRatePercent: Number(fr.managerRewardPoolFlowRatePercent),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(and(eq(flowRecipient.flowId, parentFlowId), eq(flowRecipient.recipientId, recipientId)));

  // 2) Ensure the child flow entity exists and is linked to its parent.
  await context.db
    .insert(flow)
    .values({
      id: childFlowAddress,
      kind: "child",
      parentFlow: parentFlowId,
      distributionPool: fr.distributionPool,
      managerRewardPoolFlowRatePercent: Number(fr.managerRewardPoolFlowRatePercent),
      strategy: fr.strategy,
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
        distributionPool: fr.distributionPool,
        managerRewardPoolFlowRatePercent: Number(fr.managerRewardPoolFlowRatePercent),
        strategy: fr.strategy,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
}

// Only GoalFlow can create flow-recipients (child flows).
ponder.on("GoalFlow:FlowRecipientCreated", async ({ event, context }) => {
  await handleFlowRecipientCreated({ event, context, contractName: "GoalFlow" });
});
