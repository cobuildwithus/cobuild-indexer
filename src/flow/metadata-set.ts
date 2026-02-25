import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { flow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleMetadataSet(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const flowId = event.log.address;
  const md = event.args.metadata;

  await context.db.sql
    .update(flow)
    .set({
      metadataTitle: md.title ?? null,
      metadataDescription: md.description ?? null,
      metadataImage: md.image ?? null,
      metadataTagline: md.tagline ?? null,
      metadataUrl: md.url ?? null,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(flow.id, flowId));
}

ponder.on("GoalFlow:MetadataSet", async ({ event, context }) => {
  await handleMetadataSet({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:MetadataSet", async ({ event, context }) => {
  await handleMetadataSet({ event, context, contractName: "ChildFlow" });
});
