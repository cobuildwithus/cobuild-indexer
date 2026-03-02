import { ponder } from "ponder:registry";
import { hookProcess } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalRevnetSplitHook:GoalSuccessSettlementProcessed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalRevnetSplitHook" });

  await context.db
    .insert(hookProcess)
    .values({
      id: event.id,
      eventName: "GoalSuccessSettlementProcessed",
      projectId: event.args.projectId,
      sourceToken: event.args.sourceToken,
      sourceAmount: event.args.sourceAmount,
      burnAmount: event.args.burnAmount,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
