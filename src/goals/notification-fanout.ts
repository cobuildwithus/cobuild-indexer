import type { Hex } from "viem";

import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getGoalRow,
  getGoalStakeholderAccounts,
} from "../helpers/protocolNotifications";

type GoalNotificationContext = Parameters<typeof getGoalRow>[0]["context"];
type GoalNotificationEvent = Parameters<typeof emitProtocolNotifications>[0]["event"];

export async function emitGoalAudienceNotification(args: {
  context: GoalNotificationContext;
  event: GoalNotificationEvent;
  goalTreasuryAddress: Hex;
  reason: string;
  sourceType: string;
  sourceId: string;
  actorWalletAddress?: Hex | null;
}): Promise<void> {
  const goalRow = await getGoalRow({
    context: args.context,
    goalTreasuryAddress: args.goalTreasuryAddress,
  });
  if (!goalRow) return;

  const stakeholderAccounts = await getGoalStakeholderAccounts({
    context: args.context,
    goalTreasuryAddress: goalRow.id,
  });
  const recipients = collectRecipientRoles({
    goalOwner: (goalRow.owner ?? null) as `0x${string}` | null,
    stakeholderAccounts,
  });
  if (recipients.length === 0) return;

  await emitProtocolNotifications({
    context: args.context,
    event: args.event,
    notifications: recipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason: args.reason,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      actorWalletAddress: args.actorWalletAddress ?? null,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: args.reason,
        actorWalletAddress: args.actorWalletAddress ?? null,
      }),
    })),
  });
}
