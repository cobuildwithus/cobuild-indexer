import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { flow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleTargetOutflowRateUpdated(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  await context.db.sql
    .update(flow)
    .set({
      targetOutflowRate: event.args.newTargetOutflowRate,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(flow.id, event.log.address));
}

ponder.on("GoalFlow:TargetOutflowRateUpdated", async ({ event, context }) => {
  await handleTargetOutflowRateUpdated({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:TargetOutflowRateUpdated", async ({ event, context }) => {
  await handleTargetOutflowRateUpdated({ event, context, contractName: "ChildFlow" });
});
