import { ponder } from "ponder:registry";

import { goalTreasury } from "ponder:schema";
import { reassertGraceReminderSourceId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitGoalAudienceNotification } from "./notification-fanout";

ponder.on("GoalTreasury:SuccessAssertionResolutionFailClosed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });
  const existingGoal = await context.db.find(goalTreasury, { id: event.log.address });

  await emitGoalAudienceNotification({
    context,
    event,
    goalTreasuryAddress: event.log.address,
    reason: "goal_success_assertion_resolution_fail_closed",
    sourceType: "goal_success_assertion",
    sourceId: `${event.log.address.toLowerCase()}:${event.transaction.hash.toLowerCase()}:${event.log.logIndex}:goal_success_assertion_resolution_fail_closed`,
  });

  if (existingGoal?.successAssertionId && existingGoal?.reassertGraceDeadline) {
    await emitGoalAudienceNotification({
      context,
      event,
      goalTreasuryAddress: event.log.address,
      reason: "goal_success_assertion_reassert_grace_ending_soon",
      sourceType: "goal_success_assertion_reassert_grace_reminder",
      sourceId: reassertGraceReminderSourceId(event.log.address, existingGoal.successAssertionId),
      notificationClass: "cycle",
      action: "invalidate",
      schedule: {
        reassertGraceDeadline: existingGoal.reassertGraceDeadline,
      },
    });
  }
});
