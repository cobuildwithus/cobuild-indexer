import { ponder } from "ponder:registry";

import { budgetTreasury } from "ponder:schema";
import { reassertGraceReminderSourceId } from "../helpers/ids";
import {
  buildProtocolNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBudgetLifecycleNotificationContext,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:StateTransition", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });
  const treasury = event.log.address;
  const newState = Number(event.args.newState);
  const existingBudget = await context.db.find(budgetTreasury, { id: event.log.address });
  await context.db
    .update(budgetTreasury, { id: event.log.address })
    .set({
      state: newState,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const reason =
    newState === 1
      ? "budget_active"
      : newState === 2
        ? "budget_succeeded"
        : newState === 3
          ? "budget_failed"
          : newState === 4
            ? "budget_expired"
            : null;
  if (!reason) return;

  const notificationContext = await getBudgetLifecycleNotificationContext({
    context,
    budgetTreasuryAddress: treasury,
  });
  const goalRow = notificationContext.goalRow;
  if (!goalRow) return;

  const recipients = collectRecipientRoles({
    goalOwner: (goalRow.owner ?? null) as `0x${string}` | null,
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
  if (recipients.length === 0) return;
  const successAssertionId =
    existingBudget?.successAssertionId && existingBudget.successAssertionId.startsWith("0x")
      ? existingBudget.successAssertionId
      : null;

  await emitProtocolNotifications({
    context,
    event,
    notifications: recipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason,
      sourceType: "budget_state",
      sourceId: `${treasury.toLowerCase()}:${reason}`,
      payload: buildProtocolNotificationPayload({
        role: recipient.role,
        goalRow,
        reason,
        itemId: notificationContext.itemId,
        requestIndex: notificationContext.requestIndex,
        budgetTreasury: treasury,
      }),
    })).concat(
      successAssertionId &&
        existingBudget?.reassertGraceDeadline &&
        (reason === "budget_succeeded" || reason === "budget_failed" || reason === "budget_expired")
        ? recipients.map((recipient) => ({
            recipientWalletAddress: recipient.recipientWalletAddress,
            reason: "budget_success_assertion_reassert_grace_ending_soon",
            sourceType: "budget_success_assertion_reassert_grace_reminder",
            sourceId: reassertGraceReminderSourceId(treasury, successAssertionId),
            notificationClass: "cycle" as const,
            action: "invalidate" as const,
            payload: buildProtocolNotificationPayload({
              role: recipient.role,
              goalRow,
              reason: "budget_success_assertion_reassert_grace_ending_soon",
              itemId: notificationContext.itemId,
              requestIndex: notificationContext.requestIndex,
              budgetTreasury: treasury,
              schedule: {
                reassertGraceDeadline: existingBudget.reassertGraceDeadline,
              },
            }),
          }))
        : []
    ),
  });
});
