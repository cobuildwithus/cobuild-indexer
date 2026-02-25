import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { goalTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:FlowRateSynced", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  await context.db.sql
    .update(goalTreasury)
    .set({
      lastSyncedTargetRate: event.args.targetRate,
      lastSyncedAppliedRate: event.args.appliedRate,
      lastSyncedTreasuryBalance: event.args.treasuryBalance,
      lastSyncedTimeRemaining: event.args.timeRemaining,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(goalTreasury.id, event.log.address));
});
