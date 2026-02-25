import { ponder } from "ponder:registry";
import { goalTreasury, rewardEscrow, stakeVault } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:GoalConfigured", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  const treasury = event.log.address;

  await context.db
    .insert(goalTreasury)
    .values({
      id: treasury,
      recipientId: event.args.recipientId,
      goalToken: event.args.goalToken,
      cobuildToken: event.args.cobuildToken,
      stakeVault: event.args.stakeVault,
      rewardEscrow: event.args.rewardEscrow,
      hook: event.args.hook,
      strategy: event.args.strategy,
      parentFlow: event.args.parentFlow,
      state: null,
      finalized: false,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        recipientId: event.args.recipientId,
        goalToken: event.args.goalToken,
        cobuildToken: event.args.cobuildToken,
        stakeVault: event.args.stakeVault,
        rewardEscrow: event.args.rewardEscrow,
        hook: event.args.hook,
        strategy: event.args.strategy,
        parentFlow: event.args.parentFlow,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });

  // Ensure related aggregates exist.
  await context.db
    .insert(stakeVault)
    .values({
      id: event.args.stakeVault,
      kind: "goal",
      treasury,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        kind: "goal",
        treasury,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(rewardEscrow)
    .values({
      id: event.args.rewardEscrow,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
