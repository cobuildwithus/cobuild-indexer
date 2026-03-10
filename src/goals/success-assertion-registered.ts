import { ponder } from "ponder:registry";

import { goalTreasury, treasurySuccessAssertionContext } from "ponder:schema";
import { reassertGraceReminderSourceId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitGoalAudienceNotification } from "./notification-fanout";

ponder.on("GoalTreasury:SuccessAssertionRegistered", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });
  const existingGoal = await context.db.find(goalTreasury, { id: event.log.address });
  const previousAssertionId = existingGoal?.successAssertionId ?? null;
  const previousReassertGraceDeadline = existingGoal?.reassertGraceDeadline ?? null;

  await context.db
    .update(goalTreasury, { id: event.log.address })
    .set({
      successAssertionId: event.args.assertionId,
      successAssertionRegisteredAt: event.args.assertedAt,
      reassertGraceDeadline: null,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(treasurySuccessAssertionContext)
    .values({
      id: event.args.assertionId,
      scope: "goal",
      treasury: event.log.address,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      scope: "goal",
      treasury: event.log.address,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await emitGoalAudienceNotification({
    context,
    event,
    goalTreasuryAddress: event.log.address,
    reason: "goal_success_assertion_registered",
    sourceType: "goal_success_assertion",
    sourceId: `${event.log.address.toLowerCase()}:${event.transaction.hash.toLowerCase()}:${event.log.logIndex}:goal_success_assertion_registered`,
  });

  if (previousAssertionId && previousReassertGraceDeadline) {
    await emitGoalAudienceNotification({
      context,
      event,
      goalTreasuryAddress: event.log.address,
      reason: "goal_success_assertion_reassert_grace_ending_soon",
      sourceType: "goal_success_assertion_reassert_grace_reminder",
      sourceId: reassertGraceReminderSourceId(event.log.address, previousAssertionId),
      notificationClass: "cycle",
      action: "invalidate",
      schedule: {
        reassertGraceDeadline: previousReassertGraceDeadline,
      },
    });
  }
});
