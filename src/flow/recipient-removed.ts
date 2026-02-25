import { ponder } from "ponder:registry";
import { and, eq } from "drizzle-orm";

import { flowRecipient } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleRecipientRemoved(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const flowId = event.log.address;
  const recipientId = event.args.recipientId;

  await context.db.sql
    .update(flowRecipient)
    .set({
      isRemoved: true,
      allocationUnitsSum: 0n,
      distributionUnits: 0n,
      removedAtBlock: event.block.number,
      removedAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(and(eq(flowRecipient.flowId, flowId), eq(flowRecipient.recipientId, recipientId)));
}

ponder.on("GoalFlow:RecipientRemoved", async ({ event, context }) => {
  await handleRecipientRemoved({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:RecipientRemoved", async ({ event, context }) => {
  await handleRecipientRemoved({ event, context, contractName: "ChildFlow" });
});
