import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { flow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleFlowRateIncreaseNoop(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  await context.db.sql
    .update(flow)
    .set({
      currentFlowRate: event.args.oldFlowRate,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(flow.id, event.log.address));
}

ponder.on("GoalFlow:FlowRateIncreaseNoop", async ({ event, context }) => {
  await handleFlowRateIncreaseNoop({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:FlowRateIncreaseNoop", async ({ event, context }) => {
  await handleFlowRateIncreaseNoop({ event, context, contractName: "ChildFlow" });
});
