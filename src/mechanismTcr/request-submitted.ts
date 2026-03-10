import { ponder } from "ponder:registry";
import { allocationMechanismTcrAbi as AllocationMechanismTCRAbi } from "@cobuild/wire";

import { tcrItem, tcrRequest } from "ponder:schema";
import { requestChallengeReminderSourceId, tcrItemId, tcrRequestId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  challengeWindowReminderLabel,
  challengeWindowReminderReason,
  collectRecipientRoles,
  emitProtocolNotificationSchedules,
  emitProtocolNotifications,
  getBigIntArg,
  getHexArg,
  reminderDeliverAt,
  toRequestType,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { getMechanismNotificationContext } from "./helpers";

ponder.on("AllocationMechanismTCR:RequestSubmitted", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "AllocationMechanismTCR" });

  const tcrAddress = event.log.address;
  const itemId = getHexArg(event.args, "_itemID", "itemID");
  const requestIndex = getBigIntArg(event.args, "_requestIndex", "requestIndex");
  if (!itemId || requestIndex === null) return;

  const requestType = toRequestType(getBigIntArg(event.args, "_requestType", "requestType"));
  const requester = getHexArg(event.args, "_requester", "requester");
  const mechanismContext = await getMechanismNotificationContext({
    context,
    mechanismTcrAddress: tcrAddress,
  });
  const existingItem = await context.db.find(tcrItem, {
    id: tcrItemId(tcrAddress, itemId),
  });

  await context.db
    .insert(tcrRequest)
    .values({
      id: tcrRequestId(tcrAddress, itemId, requestIndex),
      tcrAddress,
      tcrKind: "mechanism",
      itemId,
      requestIndex,
      goalTreasury: mechanismContext.goalRow?.id ?? mechanismContext.goalTreasury,
      budgetTreasury: mechanismContext.budgetTreasury,
      requestType,
      requester,
      submittedAt: event.block.timestamp,
      txHash: event.transaction.hash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      tcrKind: "mechanism",
      goalTreasury: mechanismContext.goalRow?.id ?? mechanismContext.goalTreasury,
      budgetTreasury: mechanismContext.budgetTreasury,
      requestType,
      requester,
      submittedAt: event.block.timestamp,
      txHash: event.transaction.hash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(tcrItem)
    .values({
      id: tcrItemId(tcrAddress, itemId),
      tcrAddress,
      tcrKind: "mechanism",
      itemId,
      goalTreasury: mechanismContext.goalRow?.id ?? mechanismContext.goalTreasury,
      budgetTreasury: mechanismContext.budgetTreasury,
      latestRequestIndex: requestIndex,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      tcrKind: "mechanism",
      goalTreasury: mechanismContext.goalRow?.id ?? mechanismContext.goalTreasury,
      budgetTreasury: mechanismContext.budgetTreasury,
      latestRequestIndex: requestIndex,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  if (requestType === "unknown" || !mechanismContext.goalRow) return;

  const reason =
    requestType === "registration" ? "mechanism_proposed" : "mechanism_removal_requested";
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
      reason,
      sourceType: "mechanism_request",
      sourceId: `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}:${reason}`,
      actorWalletAddress: requester,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow: mechanismContext.goalRow,
        reason,
        itemId,
        requestIndex,
        budgetTreasury: mechanismContext.budgetTreasury,
        actorWalletAddress: requester,
      }),
    })),
  });

  const requestState = await context.client.readContract({
    address: tcrAddress,
    abi: AllocationMechanismTCRAbi,
    functionName: "getRequestState",
    args: [itemId, requestIndex],
    blockNumber: event.block.number,
  });
  const challengeDeadline = requestState[1];
  const deliverAt = reminderDeliverAt({
    windowStartAt: event.block.timestamp,
    windowEndAt: challengeDeadline,
  });
  if (deliverAt === null) return;

  const reminderReason = challengeWindowReminderReason({
    tcrKind: "mechanism",
    requestType,
  });
  const reminderContextLabel = challengeWindowReminderLabel({
    tcrKind: "mechanism",
    requestType,
  });

  await emitProtocolNotificationSchedules({
    context,
    event,
    notifications: recipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason: reminderReason,
      sourceType: "mechanism_request_challenge_reminder",
      sourceId: requestChallengeReminderSourceId(tcrAddress, itemId, requestIndex, reminderReason),
      deliverAt,
      actorWalletAddress: requester,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow: mechanismContext.goalRow,
        reason: reminderReason,
        itemId,
        requestIndex,
        budgetTreasury: mechanismContext.budgetTreasury,
        actorWalletAddress: requester,
        labels: {
          reminderContextLabel,
        },
        schedule: {
          deliverAt,
          challengeDeadline,
        },
      }),
    })),
  });
});
