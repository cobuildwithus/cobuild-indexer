import { ponder } from "ponder:registry";

import { goalTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:FlowRateSyncManualInterventionRequired", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  const existingGoalTreasury = await context.db.find(goalTreasury, { id: event.log.address });
  if (!existingGoalTreasury) return;

  await context.db
    .update(goalTreasury, { id: event.log.address })
    .set({
      lastSyncAlertFlow: event.args.flow,
      lastSyncAlertTargetRate: event.args.targetRate,
      lastSyncAlertFallbackRate: event.args.fallbackRate,
      lastSyncAlertCurrentRate: event.args.currentRate,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
