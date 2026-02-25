import { ponder } from "ponder:registry";
import { rewardEscrow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("RewardEscrow:RewardEscrowFinalized", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "RewardEscrow" });

  await context.db
    .insert(rewardEscrow)
    .values({
      id: event.log.address,
      goalReward: event.args.goalReward,
      cobuildReward: event.args.cobuildReward,
      totalGoalStaked: event.args.totalGoalStaked,
      totalCobuildStaked: event.args.totalCobuildStaked,
      goalToken: event.args.goalToken,
      cobuildToken: event.args.cobuildToken,
      finalized: true,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        goalReward: event.args.goalReward,
        cobuildReward: event.args.cobuildReward,
        totalGoalStaked: event.args.totalGoalStaked,
        totalCobuildStaked: event.args.totalCobuildStaked,
        goalToken: event.args.goalToken,
        cobuildToken: event.args.cobuildToken,
        finalized: true,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
});
