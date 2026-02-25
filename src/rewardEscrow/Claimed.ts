import { ponder } from "ponder:registry";
import { rewardClaim } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("RewardEscrow:Claimed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "RewardEscrow" });

  await context.db
    .insert(rewardClaim)
    .values({
      id: event.id,
      escrow: event.log.address,
      account: event.args.account,
      amount: event.args.amount,
      isGoalToken: Boolean(event.args.isGoalToken),
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
