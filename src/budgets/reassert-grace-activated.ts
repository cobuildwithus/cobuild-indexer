import { ponder } from "ponder:registry";

import { budgetTreasury } from "ponder:schema";
import { reassertGraceReminderSourceId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotificationSchedules,
  getBudgetLifecycleNotificationContext,
  reminderDeliverAt,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitBudgetAudienceNotification } from "./notification-fanout";

ponder.on("BudgetTreasury:ReassertGraceActivated", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });
  await context.db
    .update(budgetTreasury, { id: event.log.address })
    .set({
      successAssertionId: event.args.clearedAssertionId,
      reassertGraceDeadline: event.args.graceDeadline,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await emitBudgetAudienceNotification({
    context,
    event,
    budgetTreasuryAddress: event.log.address,
    reason: "budget_success_assertion_reassert_grace_activated",
    sourceType: "budget_success_assertion",
    sourceId: `${event.log.address.toLowerCase()}:${event.transaction.hash.toLowerCase()}:${event.log.logIndex}:budget_success_assertion_reassert_grace_activated`,
    includeBudgetController: true,
    includeBudgetUnderwriters: true,
    includeRequestActors: true,
  });

  const notificationContext = await getBudgetLifecycleNotificationContext({
    context,
    budgetTreasuryAddress: event.log.address,
  });
  const goalRow = notificationContext.goalRow;
  if (!goalRow) return;

  const recipients = collectRecipientRoles({
    budgetController: notificationContext.budgetController,
    budgetUnderwriterAccounts: notificationContext.underwriterAccounts,
    requestActors: [
      {
        address: notificationContext.requester,
        role: "requester",
      },
      {
        address: notificationContext.proposer,
        role: "proposer",
      },
    ],
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
      reason: "budget_success_assertion_reassert_grace_ending_soon" as const,
      sourceType: "budget_success_assertion_reassert_grace_reminder",
      sourceId: reassertGraceReminderSourceId(event.log.address, event.args.clearedAssertionId),
      deliverAt,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "budget_success_assertion_reassert_grace_ending_soon",
        budgetTreasury: event.log.address,
        itemId: notificationContext.itemId,
        requestIndex: notificationContext.requestIndex,
        schedule: {
          deliverAt,
          reassertGraceDeadline: event.args.graceDeadline,
        },
      }),
    })),
  });
});
