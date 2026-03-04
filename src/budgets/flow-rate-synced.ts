import { ponder } from "ponder:registry";

import { budgetTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:FlowRateSynced", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });
  await context.db
    .update(budgetTreasury, { id: event.log.address })
    .set({
      lastSyncedTargetRate: event.args.targetRate,
      lastSyncedAppliedRate: event.args.appliedRate,
      lastSyncedTreasuryBalance: event.args.treasuryBalance,
      lastSyncedTimeRemaining: event.args.timeRemaining,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
