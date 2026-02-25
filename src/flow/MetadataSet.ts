import { ponder } from "ponder:registry";
import { and, eq } from "drizzle-orm";

import { flowRecipient } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleMetadataSet(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const flowId = event.log.address;
  const recipientId = event.args.recipientId;
  const md = event.args.metadata;

  await context.db.sql
    .update(flowRecipient)
    .set({
      title: md.title ?? null,
      description: md.description ?? null,
      image: md.image ?? null,
      tagline: md.tagline ?? null,
      url: md.url ?? null,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(and(eq(flowRecipient.flowId, flowId), eq(flowRecipient.recipientId, recipientId)));
}

ponder.on("GoalFlow:MetadataSet", async ({ event, context }) => {
  await handleMetadataSet({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:MetadataSet", async ({ event, context }) => {
  await handleMetadataSet({ event, context, contractName: "ChildFlow" });
});
