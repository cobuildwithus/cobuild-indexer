import { ponder } from "ponder:registry";

import { goalTreasury } from "ponder:schema";
import { reassertGraceReminderSourceId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getGoalUnderwriterAccounts,
  getGoalRow,
  getGoalStakeholderAccounts,
  getStakeVaultJurorAccounts,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:StateTransition", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });
  const treasury = event.log.address;
  const newState = Number(event.args.newState);
  const existingGoal = await context.db.find(goalTreasury, { id: treasury });
  await context.db
    .update(goalTreasury, { id: treasury })
    .set({
      state: newState,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const reason =
    newState === 1
      ? "goal_active"
      : newState === 2
        ? "goal_succeeded"
        : newState === 3
          ? "goal_expired"
          : null;
  if (!reason) return;

  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: treasury,
  });
  if (!goalRow) return;

  const stakeholders = await getGoalStakeholderAccounts({
    context,
    goalTreasuryAddress: treasury,
  });
  const jurors = await getStakeVaultJurorAccounts({
    context,
    stakeVaultAddress: goalRow.stakeVault,
  });
  const goalUnderwriters =
    reason === "goal_succeeded" || reason === "goal_expired"
      ? await getGoalUnderwriterAccounts({
          context,
          goalTreasuryAddress: treasury,
        })
      : [];
  const recipients = collectRecipientRoles({
    goalOwner: (goalRow.owner ?? null) as `0x${string}` | null,
    stakeholderAccounts: stakeholders,
    goalUnderwriterAccounts: goalUnderwriters,
    jurorAccounts: jurors,
  });
  const successAssertionId =
    existingGoal?.successAssertionId && existingGoal.successAssertionId.startsWith("0x")
      ? existingGoal.successAssertionId
      : null;

  await emitProtocolNotifications({
    context,
    event,
    notifications: recipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason,
      sourceType: "goal_state",
      sourceId: `${treasury.toLowerCase()}:${reason}`,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason,
      }),
    })).concat(
      successAssertionId &&
        existingGoal?.reassertGraceDeadline &&
        (reason === "goal_succeeded" || reason === "goal_expired")
        ? recipients.map((recipient) => ({
            recipientWalletAddress: recipient.recipientWalletAddress,
            reason: "goal_success_assertion_reassert_grace_ending_soon",
            sourceType: "goal_success_assertion_reassert_grace_reminder",
            sourceId: reassertGraceReminderSourceId(treasury, successAssertionId),
            notificationClass: "cycle" as const,
            action: "invalidate" as const,
            payload: buildGoalNotificationPayload({
              role: recipient.role,
              goalRow,
              reason: "goal_success_assertion_reassert_grace_ending_soon",
              schedule: {
                reassertGraceDeadline: existingGoal.reassertGraceDeadline,
              },
            }),
          }))
        : []
    ),
  });
});
