import type { Hex } from "viem";

import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBudgetLifecycleNotificationContext,
} from "../helpers/protocolNotifications";

type BudgetNotificationContext = Parameters<typeof getBudgetLifecycleNotificationContext>[0]["context"];
type BudgetNotificationEvent = Parameters<typeof emitProtocolNotifications>[0]["event"];

export async function emitBudgetAudienceNotification(args: {
  context: BudgetNotificationContext;
  event: BudgetNotificationEvent;
  budgetTreasuryAddress: Hex;
  reason: string;
  sourceType: string;
  sourceId: string;
  actorWalletAddress?: Hex | null;
  includeGoalOwner?: boolean;
  includeStakeholders?: boolean;
  includeBudgetController?: boolean;
  includeBudgetUnderwriters?: boolean;
  includeRequestActors?: boolean;
}): Promise<void> {
  const notificationContext = await getBudgetLifecycleNotificationContext({
    context: args.context,
    budgetTreasuryAddress: args.budgetTreasuryAddress,
  });
  const goalRow = notificationContext.goalRow;
  if (!goalRow) return;

  const recipients = collectRecipientRoles({
    goalOwner: args.includeGoalOwner ? (goalRow.owner ?? null) as `0x${string}` | null : null,
    budgetController: args.includeBudgetController ? notificationContext.budgetController : null,
    stakeholderAccounts: args.includeStakeholders ? notificationContext.stakeholderAccounts : [],
    budgetUnderwriterAccounts: args.includeBudgetUnderwriters
      ? notificationContext.underwriterAccounts
      : [],
    requestActors: args.includeRequestActors
      ? [
          {
            address: notificationContext.requester,
            role: "requester" as const,
          },
          {
            address: notificationContext.proposer,
            role: "proposer" as const,
          },
        ]
      : [],
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
        itemId: notificationContext.itemId,
        requestIndex: notificationContext.requestIndex,
        budgetTreasury: args.budgetTreasuryAddress,
        actorWalletAddress: args.actorWalletAddress ?? null,
      }),
    })),
  });
}
