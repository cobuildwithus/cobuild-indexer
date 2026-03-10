import { ponder } from "ponder:registry";

import { tcrItem, tcrRequest } from "ponder:schema";
import { tcrItemId, tcrRequestId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBigIntArg,
  getHexArg,
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
});
