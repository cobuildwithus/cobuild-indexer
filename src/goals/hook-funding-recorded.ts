import { ponder } from "ponder:registry";
import { hookFunding } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:HookFundingRecorded", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  await context.db
    .insert(hookFunding)
    .values({
      id: event.id,
      goalTreasury: event.log.address,
      kind: "RECORDED",
      amount: event.args.amount,
      superTokenAmount: event.args.amount,
      totalRaised: event.args.totalRaised,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
