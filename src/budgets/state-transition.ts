import { ponder } from "ponder:registry";

import { budgetTreasury, goalContextByBudgetTreasury } from "ponder:schema";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBudgetUnderwriterAccounts,
  getGoalRow,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:StateTransition", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });
  const treasury = event.log.address;
  await context.db
    .update(budgetTreasury, { id: event.log.address })
    .set({
      state: Number(event.args.newState),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const reason =
    event.args.newState === 1
      ? "budget_active"
      : event.args.newState === 2
        ? "budget_succeeded"
        : event.args.newState === 3
          ? "budget_failed"
          : event.args.newState === 4
            ? "budget_expired"
            : null;
  if (!reason) return;

  const goalContext = await context.db.find(goalContextByBudgetTreasury, { id: treasury });
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: goalContext?.goalTreasury ?? null,
  });
  const underwriters = await getBudgetUnderwriterAccounts({
    context,
    budgetTreasuryAddress: treasury,
  });
  if (underwriters.length === 0) return;

  const recipients = collectRecipientRoles({
    budgetUnderwriterAccounts: underwriters,
  });

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
        budgetTreasury: treasury,
      }),
    })),
  });
});
