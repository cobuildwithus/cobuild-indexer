import { ponder } from "ponder:registry";

import { budgetTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:FlowRateSyncManualInterventionRequired", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });
  await context.db
    .update(budgetTreasury, { id: event.log.address })
    .set({
      lastSyncAlertFlow: event.args.flow,
      lastSyncAlertTargetRate: event.args.targetRate,
      lastSyncAlertFallbackRate: event.args.fallbackRate,
      lastSyncAlertCurrentRate: event.args.currentRate,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
