import { ponder } from "ponder:registry";

import { goalTreasury } from "ponder:schema";
import { reassertGraceReminderSourceId } from "../helpers/ids";
import {
  buildProtocolNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotificationSchedules,
  getGoalRow,
  getGoalStakeholderAccounts,
  reminderDeliverAt,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitGoalAudienceNotification } from "./notification-fanout";

ponder.on("GoalTreasury:ReassertGraceActivated", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });
  await context.db
    .update(goalTreasury, { id: event.log.address })
    .set({
      successAssertionId: event.args.clearedAssertionId,
      reassertGraceDeadline: event.args.graceDeadline,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await emitGoalAudienceNotification({
    context,
    event,
    goalTreasuryAddress: event.log.address,
    reason: "goal_success_assertion_reassert_grace_activated",
    sourceType: "goal_success_assertion",
    sourceId: `${event.log.address.toLowerCase()}:${event.transaction.hash.toLowerCase()}:${event.log.logIndex}:goal_success_assertion_reassert_grace_activated`,
  });

  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: event.log.address,
  });
  if (!goalRow) return;

  const stakeholderAccounts = await getGoalStakeholderAccounts({
    context,
    goalTreasuryAddress: goalRow.id,
  });
  const recipients = collectRecipientRoles({
    goalOwner: goalRow.owner,
    stakeholderAccounts,
  });
  const deliverAt = reminderDeliverAt({
    windowStartAt: event.block.timestamp,
    windowEndAt: event.args.graceDeadline,
  });
  if (recipients.length === 0 || deliverAt === null) return;

  await emitProtocolNotificationSchedules({
    context,
    event,
    notifications: recipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason: "goal_success_assertion_reassert_grace_ending_soon" as const,
      sourceType: "goal_success_assertion_reassert_grace_reminder",
      sourceId: reassertGraceReminderSourceId(event.log.address, event.args.clearedAssertionId),
      deliverAt,
      payload: buildProtocolNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "goal_success_assertion_reassert_grace_ending_soon",
        schedule: {
          deliverAt,
          reassertGraceDeadline: event.args.graceDeadline,
        },
      }),
    })),
  });
});
