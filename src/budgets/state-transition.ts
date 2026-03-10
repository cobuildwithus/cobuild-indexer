import { ponder } from "ponder:registry";

import { budgetTreasury } from "ponder:schema";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBudgetLifecycleNotificationContext,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:StateTransition", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });
  const treasury = event.log.address;
  const newState = Number(event.args.newState);
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

  await emitProtocolNotifications({
    context,
    event,
    notifications: recipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason,
      sourceType: "budget_state",
      sourceId: `${treasury.toLowerCase()}:${reason}`,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason,
        itemId: notificationContext.itemId,
        requestIndex: notificationContext.requestIndex,
        budgetTreasury: treasury,
      }),
    })),
  });
});
