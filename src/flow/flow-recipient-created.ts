import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import { budgetStack, flow, flowRecipient } from "ponder:schema";
import { flowRecipientKey } from "../helpers/ids";

import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleFlowRecipientCreated(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const parentFlowId: Hex = event.log.address;
  const recipientId: Hex = event.args.recipientId;
  const childFlowAddress: Hex = event.args.recipient;
  const stack = await context.db.find(budgetStack, { id: recipientId });
  const flowRecipientId = flowRecipientKey(parentFlowId, recipientId);

  // 1) Mark the (already-created) recipient row as a flow-recipient.
  await context.db.update(flowRecipient, { id: flowRecipientId }).set({
    isFlowRecipient: true,
    childDistributionPool: event.args.distributionPool,
    childManagerRewardPoolFlowRatePercent: Number(event.args.managerRewardPoolFlowRatePpm),
    childStrategy: stack?.strategy ?? null,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });

  // 2) Ensure the child flow entity exists and is linked to its parent.
  await context.db
    .insert(flow)
    .values({
      id: childFlowAddress,
      kind: "child",
      parentFlow: parentFlowId,
      distributionPool: event.args.distributionPool,
      managerRewardPoolFlowRatePercent: Number(event.args.managerRewardPoolFlowRatePpm),
      strategy: null,
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
      distributionPool: event.args.distributionPool,
      managerRewardPoolFlowRatePercent: Number(event.args.managerRewardPoolFlowRatePpm),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
}

// Only GoalFlow can create flow-recipients (child flows).
ponder.on("GoalFlow:FlowRecipientCreated", async ({ event, context }) => {
  await handleFlowRecipientCreated({ event, context, contractName: "GoalFlow" });
});
