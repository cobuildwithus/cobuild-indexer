import { ponder } from "ponder:registry";

import { flow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleTargetOutflowRateUpdated(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });
  const flowId = event.log.address;

  await context.db
    .update(flow, { id: flowId })
    .set({
      targetOutflowRate: event.args.newRate,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalFlow:TargetOutflowRateUpdated", async ({ event, context }) => {
  await handleTargetOutflowRateUpdated({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:TargetOutflowRateUpdated", async ({ event, context }) => {
  await handleTargetOutflowRateUpdated({ event, context, contractName: "ChildFlow" });
});
