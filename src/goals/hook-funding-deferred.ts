import { ponder } from "ponder:registry";
import { hookFunding } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:HookFundingDeferred", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  await context.db
    .insert(hookFunding)
    .values({
      id: event.id,
      goalTreasury: event.log.address,
      kind: "DEFERRED",
      amount: event.args.superTokenAmount,
      token: event.args.sourceToken,
      sourceAmount: event.args.sourceAmount,
      superTokenAmount: event.args.superTokenAmount,
      deferredSuperTokenAmount: event.args.totalDeferredSuperTokenAmount,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
