import { ponder } from "ponder:registry";
import { hookProcess } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalRevnetSplitHook:GoalFundingProcessed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalRevnetSplitHook" });

  await context.db
    .insert(hookProcess)
    .values({
      id: event.id,
      eventName: "GoalFundingProcessed",
      projectId: event.args.projectId,
      sourceToken: event.args.sourceToken,
      sourceAmount: event.args.sourceAmount,
      superTokenAmount: event.args.superTokenAmount,
      accepted: Boolean(event.args.accepted),
      action: Number(event.args.action),
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
