import { ponder } from "ponder:registry";
import { flowRecipient } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";
import { flowRecipientKey } from "../helpers/ids";
import { DEFAULT_DISTRIBUTION_UNITS } from "../helpers/allocationSnapshot";

async function handleRecipientCreated(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const flowId = event.log.address;
  const recipientId = event.args.recipientId;
  const recipientAddress = event.args.recipient;

  const info = event.args.recipientInfo;
  const recipientIndex = Number(info.recipientIndexPlusOne) - 1;

  const metadata = info.metadata ?? {};
  const title = metadata.title ?? null;
  const description = metadata.description ?? null;
  const image = metadata.image ?? null;
  const tagline = metadata.tagline ?? null;
  const url = metadata.url ?? null;

  await context.db
    .insert(flowRecipient)
    .values({
      id: flowRecipientKey(flowId, recipientId),
      flowId,
      recipientId,
      recipient: recipientAddress,
      recipientIndex,
      recipientType: Number(info.recipientType),
      isRemoved: Boolean(info.isRemoved),

      title,
      description,
      image,
      tagline,
      url,

      isFlowRecipient: false,

      allocationUnitsSum: 0n,
      distributionUnits: Boolean(info.isRemoved) ? 0n : DEFAULT_DISTRIBUTION_UNITS,

      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
}

// Root flow recipients
ponder.on("GoalFlow:RecipientCreated", async ({ event, context }) => {
  await handleRecipientCreated({ event, context, contractName: "GoalFlow" });
});

// Child flow recipients
ponder.on("ChildFlow:RecipientCreated", async ({ event, context }) => {
  await handleRecipientCreated({ event, context, contractName: "ChildFlow" });
});
