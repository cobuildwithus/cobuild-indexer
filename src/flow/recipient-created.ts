import { ponder } from "ponder:registry";
import { flowRecipient, flowRecipientByIndex } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";
import { flowRecipientByIndexKey, flowRecipientKey } from "../helpers/ids";
import { DEFAULT_DISTRIBUTION_UNITS } from "../helpers/allocationSnapshot";

async function handleRecipientCreated(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const flowId = event.log.address;
  const recipientId = event.args.recipientId;
  const info = event.args.recipient;
  const recipientIndex = Number(info.recipientIndexPlusOne) - 1;
  const isRemoved = Boolean(info.isRemoved);
  const blockNumber = event.block.number;
  const blockTimestamp = event.block.timestamp;

  const metadata = info.metadata ?? {};
  const title = metadata.title ?? null;
  const description = metadata.description ?? null;
  const image = metadata.image ?? null;
  const tagline = metadata.tagline ?? null;
  const url = metadata.url ?? null;
  const flowRecipientId = flowRecipientKey(flowId, recipientId);

  await context.db
    .insert(flowRecipient)
    .values({
      id: flowRecipientId,
      flowId,
      recipientId,
      recipient: info.recipient,
      approvedBy: event.args.approvedBy,
      recipientIndex,
      recipientType: Number(info.recipientType),
      isRemoved,

      title,
      description,
      image,
      tagline,
      url,

      isFlowRecipient: false,

      allocationUnitsSum: 0n,
      distributionUnits: isRemoved ? 0n : DEFAULT_DISTRIBUTION_UNITS,

      createdAtBlock: blockNumber,
      createdAtTimestamp: blockTimestamp,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoNothing();

  await context.db
    .insert(flowRecipientByIndex)
    .values({
      id: flowRecipientByIndexKey(flowId, recipientIndex),
      flowId,
      recipientIndex,
      flowRecipientId,
      recipientId,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoUpdate({
      flowRecipientId,
      recipientId,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    });
}

// Root flow recipients
ponder.on("GoalFlow:RecipientCreated", async ({ event, context }) => {
  await handleRecipientCreated({ event, context, contractName: "GoalFlow" });
});

// Child flow recipients
ponder.on("ChildFlow:RecipientCreated", async ({ event, context }) => {
  await handleRecipientCreated({ event, context, contractName: "ChildFlow" });
});
