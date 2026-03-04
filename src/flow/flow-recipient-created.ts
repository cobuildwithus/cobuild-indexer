import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import { budgetStack, flow, flowRecipient } from "ponder:schema";
import { flowRecipientKey } from "../helpers/ids";
import { queueFlowForActualRateRefresh } from "../helpers/flowRefresh";

import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleFlowRecipientCreated(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const parentFlowId: Hex = event.log.address;
  const recipientId: Hex = event.args.recipientId;
  const childFlowAddress: Hex = event.args.recipient;
  const stack = await context.db.find(budgetStack, { id: recipientId });
  const flowRecipientId = flowRecipientKey(parentFlowId, recipientId);
  const managerRewardPoolFlowRatePercent = Number(event.args.managerRewardPoolFlowRatePpm);
  const updatedAt = {
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  };
  const flowUpsertValues = {
    kind: "child" as const,
    parentFlow: parentFlowId,
    distributionPool: event.args.distributionPool,
    managerRewardPoolFlowRatePercent,
    ...updatedAt,
  };

  // 1) Mark the (already-created) recipient row as a flow-recipient.
  await context.db.update(flowRecipient, { id: flowRecipientId }).set({
    isFlowRecipient: true,
    childDistributionPool: event.args.distributionPool,
    childManagerRewardPoolFlowRatePercent: managerRewardPoolFlowRatePercent,
    childStrategy: stack?.strategy ?? null,
    ...updatedAt,
  });

  // 2) Ensure the child flow entity exists and is linked to its parent.
  await context.db
    .insert(flow)
    .values({
      id: childFlowAddress,
      ...flowUpsertValues,
      strategy: null,
      currentFlowRate: 0n,
      targetOutflowRate: 0n,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate(flowUpsertValues);

  await queueFlowForActualRateRefresh({
    context,
    event,
    flowId: childFlowAddress,
  });
}

// Root and child flows can emit FlowRecipientCreated for nested flow graphs.
ponder.on("GoalFlow:FlowRecipientCreated", async ({ event, context }) => {
  await handleFlowRecipientCreated({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:FlowRecipientCreated", async ({ event, context }) => {
  await handleFlowRecipientCreated({ event, context, contractName: "ChildFlow" });
});
