import { ponder } from "ponder:registry";

import { arbitratorDispute, tcrItem, tcrRequest } from "ponder:schema";
import {
  arbitratorDisputeId,
  requestChallengeReminderSourceId,
  tcrItemId,
  tcrRequestId,
} from "../helpers/ids";
import {
  buildProtocolNotificationPayload,
  challengeWindowReminderLabel,
  challengeWindowReminderReason,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBigIntArg,
  getHexArg,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { getMechanismNotificationContext } from "./helpers";

ponder.on("AllocationMechanismTCR:Dispute", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "AllocationMechanismTCR" });

  const tcrAddress = event.log.address;
  const itemId = getHexArg(event.args, "_itemID", "itemID");
  const disputeId = getBigIntArg(event.args, "_disputeID", "disputeID");
  const arbitratorAddress = getHexArg(event.args, "_arbitrator", "arbitrator");
  const requestIndex = getBigIntArg(event.args, "_requestIndex", "requestIndex");
  const challenger = getHexArg(event.args, "_challenger", "challenger");
  if (!itemId || disputeId === null || requestIndex === null || !challenger) return;

  const mechanismContext = await getMechanismNotificationContext({
    context,
    mechanismTcrAddress: tcrAddress,
  });
  const goalRow = mechanismContext.goalRow;
  if (!goalRow) return;

  const existingItem = await context.db.find(tcrItem, {
    id: tcrItemId(tcrAddress, itemId),
  });
  const requestId = tcrRequestId(tcrAddress, itemId, requestIndex);
  const existingRequest = await context.db.find(tcrRequest, { id: requestId });
  const requestType =
    existingRequest?.requestType === "registration" || existingRequest?.requestType === "clearing"
      ? existingRequest.requestType
      : null;

  await context.db
    .insert(tcrRequest)
    .values({
      id: requestId,
      tcrAddress,
      tcrKind: "mechanism",
      itemId,
      requestIndex,
      goalTreasury: goalRow.id,
      budgetTreasury: mechanismContext.budgetTreasury,
      requestType: existingRequest?.requestType ?? "unknown",
      requester: existingRequest?.requester ?? null,
      challenger,
      disputeId,
      challengedAt: event.block.timestamp,
      txHash: event.transaction.hash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      tcrKind: "mechanism",
      goalTreasury: goalRow.id,
      budgetTreasury: mechanismContext.budgetTreasury,
      requester: existingRequest?.requester ?? null,
      challenger,
      disputeId,
      challengedAt: event.block.timestamp,
      txHash: event.transaction.hash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const disputeRow = arbitratorAddress
    ? await context.db.find(arbitratorDispute, {
        id: arbitratorDisputeId(arbitratorAddress, disputeId),
      })
    : null;

  if (arbitratorAddress) {
    await context.db
      .insert(arbitratorDispute)
      .values({
        id: arbitratorDisputeId(arbitratorAddress, disputeId),
        arbitrator: arbitratorAddress,
        arbitrable: tcrAddress,
        goalTreasury: goalRow.id,
        stakeVault: goalRow.stakeVault,
        budgetTreasury: mechanismContext.budgetTreasury,
        tcrAddress,
        tcrKind: "mechanism",
        itemId,
        requestIndex,
        disputeId,
        currentRound: 0n,
        jurorAddresses: Array.isArray(disputeRow?.jurorAddresses)
          ? (disputeRow.jurorAddresses as `0x${string}`[])
          : [],
        votingStartTime: disputeRow?.votingStartTime ?? null,
        votingEndTime: disputeRow?.votingEndTime ?? null,
        revealPeriodEndTime: disputeRow?.revealPeriodEndTime ?? null,
        creationBlock: disputeRow?.creationBlock ?? null,
        arbitrationCost: disputeRow?.arbitrationCost ?? null,
        extraData: disputeRow?.extraData ?? null,
        choices: disputeRow?.choices ?? null,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        arbitrable: tcrAddress,
        goalTreasury: goalRow.id,
        stakeVault: goalRow.stakeVault,
        budgetTreasury: mechanismContext.budgetTreasury,
        tcrAddress,
        tcrKind: "mechanism",
        itemId,
        requestIndex,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });
  }

  const recipients = collectRecipientRoles({
    budgetController: mechanismContext.budgetController,
    budgetUnderwriterAccounts: mechanismContext.underwriterAccounts,
    requestActors: [
      {
        address: (existingRequest?.requester ?? null) as `0x${string}` | null,
        role: "requester",
      },
      { address: challenger, role: "challenger" },
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
      reason: "mechanism_challenged",
      sourceType: "mechanism_request",
      sourceId: `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}:mechanism_challenged`,
      actorWalletAddress: challenger,
      payload: buildProtocolNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "mechanism_challenged",
        itemId,
        requestIndex,
        budgetTreasury: mechanismContext.budgetTreasury,
        actorWalletAddress: challenger,
        arbitrator: arbitratorAddress,
        disputeId,
      }),
    })).concat(
      requestType
        ? recipients.map((recipient) => {
            const reminderReason = challengeWindowReminderReason({
              tcrKind: "mechanism",
              requestType,
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
              actorWalletAddress: challenger,
              payload: buildProtocolNotificationPayload({
                role: recipient.role,
                goalRow,
                reason: reminderReason,
                itemId,
                requestIndex,
                budgetTreasury: mechanismContext.budgetTreasury,
                actorWalletAddress: challenger,
                labels: {
                  reminderContextLabel: challengeWindowReminderLabel({
                    tcrKind: "mechanism",
                    requestType,
                  }),
                },
              }),
            };
          })
        : []
    ),
  });
});
