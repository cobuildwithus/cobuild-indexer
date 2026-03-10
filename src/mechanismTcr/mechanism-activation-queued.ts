import { ponder } from "ponder:registry";

import { tcrItem, tcrRequest } from "ponder:schema";
import { requestChallengeReminderSourceId, tcrItemId, tcrRequestId } from "../helpers/ids";
import {
  buildProtocolNotificationPayload,
  challengeWindowReminderLabel,
  challengeWindowReminderReason,
  collectRecipientRoles,
  emitProtocolNotifications,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { getMechanismNotificationContext } from "./helpers";

ponder.on("AllocationMechanismTCR:MechanismActivationQueued", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "AllocationMechanismTCR" });

  const tcrAddress = event.log.address;
  const itemId = event.args.itemID;
  const mechanismContext = await getMechanismNotificationContext({
    context,
    mechanismTcrAddress: tcrAddress,
  });
  const goalRow = mechanismContext.goalRow;
  if (!goalRow) return;

  const existingItem = await context.db.find(tcrItem, {
    id: tcrItemId(tcrAddress, itemId),
  });
  const requestIndex = BigInt(existingItem?.latestRequestIndex ?? -1);
  if (requestIndex < 0n) return;

  const existingRequest = await context.db.find(tcrRequest, {
    id: tcrRequestId(tcrAddress, itemId, requestIndex),
  });
  const requester = (existingRequest?.requester ?? null) as `0x${string}` | null;
  const recipients = collectRecipientRoles({
    budgetController: mechanismContext.budgetController,
    budgetUnderwriterAccounts: mechanismContext.underwriterAccounts,
    requestActors: [
      { address: requester, role: "requester" },
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
      reason: "mechanism_accepted",
      sourceType: "mechanism_request",
      sourceId: `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}:mechanism_accepted`,
      actorWalletAddress: requester,
      payload: buildProtocolNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "mechanism_accepted",
        itemId,
        requestIndex,
        budgetTreasury: mechanismContext.budgetTreasury,
        actorWalletAddress: requester,
      }),
    })).concat(
      existingRequest?.requestType === "registration"
        ? recipients.map((recipient) => {
            const reminderReason = challengeWindowReminderReason({
              tcrKind: "mechanism",
              requestType: "registration",
            });
            return {
              recipientWalletAddress: recipient.recipientWalletAddress,
              reason: reminderReason,
              sourceType: "mechanism_request_challenge_reminder",
              sourceId: requestChallengeReminderSourceId(
                tcrAddress,
                itemId,
                requestIndex,
                reminderReason
              ),
              notificationClass: "cycle" as const,
              action: "invalidate" as const,
              actorWalletAddress: requester,
              payload: buildProtocolNotificationPayload({
                role: recipient.role,
                goalRow,
                reason: reminderReason,
                itemId,
                requestIndex,
                budgetTreasury: mechanismContext.budgetTreasury,
                actorWalletAddress: requester,
                labels: {
                  reminderContextLabel: challengeWindowReminderLabel({
                    tcrKind: "mechanism",
                    requestType: "registration",
                  }),
                },
              }),
            };
          })
        : []
    ),
  });
});
