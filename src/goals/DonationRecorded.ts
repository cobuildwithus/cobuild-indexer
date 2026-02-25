import { ponder } from "ponder:registry";
import { donation } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:DonationRecorded", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  await context.db
    .insert(donation)
    .values({
      id: event.id,
      kind: "goal",
      treasury: event.log.address,
      donor: event.args.donor,
      amount: event.args.amount,
      token: event.args.token,
      memo: event.args.memo,
      metadata: event.args.metadata,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
