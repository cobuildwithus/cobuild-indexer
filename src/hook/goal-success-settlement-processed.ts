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
      recipientId: event.args.recipientId,
      caller: event.args.caller,
      amount: event.args.amount,
      token: event.args.token,
      beneficiary: event.args.beneficiary,
      succeeded: Boolean(event.args.succeeded),
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
