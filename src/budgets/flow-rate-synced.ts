import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { budgetTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:FlowRateSynced", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });

  await context.db.sql
    .update(budgetTreasury)
    .set({
      lastSyncedTargetRate: event.args.targetRate,
      lastSyncedAppliedRate: event.args.appliedRate,
      lastSyncedTreasuryBalance: event.args.treasuryBalance,
      lastSyncedTimeRemaining: event.args.timeRemaining,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(budgetTreasury.id, event.log.address));
});
