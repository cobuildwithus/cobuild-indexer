import type { Hex } from "viem";

import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBudgetLifecycleNotificationContext,
  type NotificationAction,
  type NotificationClass,
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
  notificationClass?: NotificationClass;
  action?: NotificationAction;
  includeGoalOwner?: boolean;
  includeStakeholders?: boolean;
  includeBudgetController?: boolean;
  includeBudgetUnderwriters?: boolean;
  includeRequestActors?: boolean;
  schedule?: {
    deliverAt?: bigint | null;
    votingStartTime?: bigint | null;
    votingEndTime?: bigint | null;
    revealPeriodEndTime?: bigint | null;
    challengeDeadline?: bigint | null;
    reassertGraceDeadline?: bigint | null;
  } | null;
  labels?: {
    budgetName?: string | null;
    mechanismName?: string | null;
    reminderContextLabel?: string | null;
  } | null;
  amounts?: {
    allocatedStake?: bigint | null;
    claimable?: bigint | null;
    claimedAmount?: bigint | null;
    snapshotWeight?: bigint | null;
    snapshotVotes?: bigint | null;
    slashWeight?: bigint | null;
    claimableReward?: bigint | null;
    claimableGoalSlashReward?: bigint | null;
    claimableCobuildSlashReward?: bigint | null;
    claimedReward?: bigint | null;
    claimedGoalSlashReward?: bigint | null;
    claimedCobuildSlashReward?: bigint | null;
  } | null;
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
      notificationClass: args.notificationClass,
      action: args.action,
      actorWalletAddress: args.actorWalletAddress ?? null,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: args.reason,
        itemId: notificationContext.itemId,
        requestIndex: notificationContext.requestIndex,
        budgetTreasury: args.budgetTreasuryAddress,
        actorWalletAddress: args.actorWalletAddress ?? null,
        schedule: args.schedule ?? null,
        labels: args.labels ?? null,
        amounts: args.amounts ?? null,
      }),
    })),
  });
}
