import { ponder } from "ponder:registry";
import { rewardClaim } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("RewardEscrow:Claimed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "RewardEscrow" });

  const goalTotal = event.args.rewardAmount + event.args.goalRentAmount;
  const cobuildTotal = event.args.cobuildAmount + event.args.cobuildRentAmount;

  await context.db
    .insert(rewardClaim)
    .values({
      id: event.id,
      escrow: event.log.address,
      account: event.args.account,
      to: event.args.to,
      rewardAmount: event.args.rewardAmount,
      cobuildAmount: event.args.cobuildAmount,
      goalRentAmount: event.args.goalRentAmount,
      cobuildRentAmount: event.args.cobuildRentAmount,
      amount: goalTotal + cobuildTotal,
      isGoalToken: cobuildTotal === 0n,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
