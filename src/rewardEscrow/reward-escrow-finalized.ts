import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";
import { goalTreasury, rewardEscrow, stakeVault } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("RewardEscrow:RewardEscrowFinalized", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "RewardEscrow" });

  const escrowAddress = event.log.address;
  const finalState = Number(event.args.finalState);
  const isSucceeded = finalState === 2;

  const treasuryRows = await context.db.sql
    .select({
      id: goalTreasury.id,
      stakeVault: goalTreasury.stakeVault,
    })
    .from(goalTreasury)
    .where(eq(goalTreasury.rewardEscrow, escrowAddress))
    .limit(1);

  const treasury = treasuryRows[0];

  let totalGoalStaked = 0n;
  let totalCobuildStaked = 0n;

  if (treasury?.stakeVault) {
    const vaultRows = await context.db.sql
      .select({
        goalTotalStaked: stakeVault.goalTotalStaked,
        cobuildTotalStaked: stakeVault.cobuildTotalStaked,
      })
      .from(stakeVault)
      .where(eq(stakeVault.id, treasury.stakeVault))
      .limit(1);

    const vault = vaultRows[0];
    totalGoalStaked = vault?.goalTotalStaked ?? 0n;
    totalCobuildStaked = vault?.cobuildTotalStaked ?? 0n;
  }

  await context.db
    .insert(rewardEscrow)
    .values({
      id: escrowAddress,
      finalState,
      rewardPoolSnapshot: event.args.rewardPoolSnapshot,
      cobuildPoolSnapshot: event.args.cobuildPoolSnapshot,
      totalPointsSnapshot: event.args.totalPointsSnapshot,
      goalFinalizedAt: event.args.goalFinalizedAt,
      goalReward: event.args.rewardPoolSnapshot,
      cobuildReward: event.args.cobuildPoolSnapshot,
      totalGoalStaked,
      totalCobuildStaked,
      finalized: true,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      finalState,
      rewardPoolSnapshot: event.args.rewardPoolSnapshot,
      cobuildPoolSnapshot: event.args.cobuildPoolSnapshot,
      totalPointsSnapshot: event.args.totalPointsSnapshot,
      goalFinalizedAt: event.args.goalFinalizedAt,
      goalReward: event.args.rewardPoolSnapshot,
      cobuildReward: event.args.cobuildPoolSnapshot,
      totalGoalStaked,
      totalCobuildStaked,
      finalized: true,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  if (isSucceeded && treasury) {
    await context.db.sql
      .update(goalTreasury)
      .set({
        successGoalAmount: event.args.rewardPoolSnapshot,
        successCobuildAmount: event.args.cobuildPoolSnapshot,
        successTotalGoalStaked: totalGoalStaked,
        successTotalCobuildStaked: totalCobuildStaked,
        successAt: event.args.goalFinalizedAt,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .where(eq(goalTreasury.id, treasury.id));
  }
});
