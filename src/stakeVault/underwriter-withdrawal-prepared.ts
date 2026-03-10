import { ponder } from "ponder:registry";

import { stakeVault } from "ponder:schema";
import {
  buildGoalNotificationPayload,
  emitProtocolNotifications,
  getGoalRow,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:UnderwriterWithdrawalPrepared", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });

  if (!event.args.complete) return;

  const stakeVaultRow = await context.db.find(stakeVault, { id: event.log.address });
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: stakeVaultRow?.treasury ?? null,
  });
  const underwriter = event.args.underwriter;
  const sourceId = goalRow
    ? `${goalRow.id.toLowerCase()}:${underwriter.toLowerCase()}`
    : `${event.log.address.toLowerCase()}:${underwriter.toLowerCase()}`;

  await emitProtocolNotifications({
    context,
    event,
    notifications: [
      {
        recipientWalletAddress: underwriter,
        reason: "underwriter_withdrawal_prep_required",
        sourceType: "underwriter_withdrawal_prep_state",
        sourceId,
        notificationClass: "open_close" as const,
        action: "invalidate",
        payload: buildGoalNotificationPayload({
          role: "goal_stakeholder",
          goalRow,
          reason: "underwriter_withdrawal_prep_required",
        }),
      },
    ],
  });
});
