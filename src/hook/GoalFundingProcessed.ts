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
      recipientId: event.args.recipientId,
      caller: event.args.caller,
      amount: event.args.amount,
      token: event.args.token,
      beneficiary: null,
      succeeded: null,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
