import { ponder } from "ponder:registry";

import {
  budgetStack,
  budgetTreasury as budgetTreasuryTable,
  budgetTreasuryByRecipient,
  goalContextByBudgetTcr,
  tcrItem,
  tcrRequest,
} from "ponder:schema";
import {
  requestChallengeReminderSourceId,
  tcrItemId,
  tcrRequestId,
} from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  challengeWindowReminderLabel,
  challengeWindowReminderReason,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBudgetUnderwriterAccounts,
  getGoalRow,
  getGoalStakeholderAccounts,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { upsertBudgetStackStatus } from "./budget-stack-status";

ponder.on("BudgetTCR:BudgetStackRemovalQueued", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const tcrAddress = event.log.address;
  const itemId = event.args.itemID;

  await upsertBudgetStackStatus({
    db: context.db,
    table: budgetStack,
    itemId,
    status: "REMOVAL_QUEUED",
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  const goalContext = await context.db.find(goalContextByBudgetTcr, { id: tcrAddress });
  const existingItem = await context.db.find(tcrItem, {
    id: tcrItemId(tcrAddress, itemId),
  });
  const requestIndex = BigInt(existingItem?.latestRequestIndex ?? -1);
  if (requestIndex < 0n) return;

  const existingRequest = await context.db.find(tcrRequest, {
    id: tcrRequestId(tcrAddress, itemId, requestIndex),
  });
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: existingRequest?.goalTreasury ?? goalContext?.goalTreasury ?? null,
  });
  if (!goalRow) return;

  const stakeholders = await getGoalStakeholderAccounts({
    context,
    goalTreasuryAddress: goalRow.id,
  });
  const budgetLink = await context.db.find(budgetTreasuryByRecipient, { id: itemId });
  const budgetRow =
    budgetLink?.budgetTreasury
      ? await context.db.find(budgetTreasuryTable, { id: budgetLink.budgetTreasury })
      : null;
  const budgetUnderwriters = await getBudgetUnderwriterAccounts({
    context,
    budgetTreasuryAddress: (budgetLink?.budgetTreasury ?? null) as `0x${string}` | null,
  });
  const requester = existingRequest?.requester ?? null;
  const recipients = collectRecipientRoles({
    goalOwner: (goalRow.owner ?? null) as `0x${string}` | null,
    budgetController: (budgetRow?.controller ?? null) as `0x${string}` | null,
    stakeholderAccounts: stakeholders,
    budgetUnderwriterAccounts: budgetUnderwriters,
    requestActors: [
      {
        address: requester as `0x${string}` | null,
        role: "requester",
      },
      {
        address: (existingItem?.submitter ?? null) as `0x${string}` | null,
        role: "proposer",
      },
    ],
  });

  await emitProtocolNotifications({
    context,
    event,
    notifications: recipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason: "budget_removal_accepted",
      sourceType: "budget_request",
      sourceId: `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}:budget_removal_accepted`,
      actorWalletAddress: requester as `0x${string}` | null,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "budget_removal_accepted",
        itemId,
        requestIndex,
        budgetTreasury: (budgetLink?.budgetTreasury ?? null) as `0x${string}` | null,
        actorWalletAddress: requester as `0x${string}` | null,
      }),
    })).concat(
      existingRequest?.requestType === "clearing"
        ? recipients.map((recipient) => {
            const reminderReason = challengeWindowReminderReason({
              tcrKind: "budget",
              requestType: "clearing",
            });
            return {
              recipientWalletAddress: recipient.recipientWalletAddress,
              reason: reminderReason,
              sourceType: "budget_request_challenge_reminder",
              sourceId: requestChallengeReminderSourceId(
                tcrAddress,
                itemId,
                requestIndex,
                reminderReason
              ),
              notificationClass: "cycle" as const,
              action: "invalidate" as const,
              actorWalletAddress: requester as `0x${string}` | null,
              payload: buildGoalNotificationPayload({
                role: recipient.role,
                goalRow,
                reason: reminderReason,
                itemId,
                requestIndex,
                budgetTreasury: (budgetLink?.budgetTreasury ?? null) as `0x${string}` | null,
                actorWalletAddress: requester as `0x${string}` | null,
                labels: {
                  reminderContextLabel: challengeWindowReminderLabel({
                    tcrKind: "budget",
                    requestType: "clearing",
                  }),
                },
              }),
            };
          })
        : []
    ),
  });
});
