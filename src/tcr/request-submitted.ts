import { ponder } from "ponder:registry";
import { goalContextByBudgetTcr, tcrItem, tcrRequest } from "ponder:schema";
import { tcrItemId, tcrRequestId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBigIntArg,
  getGoalRow,
  getGoalStakeholderAccounts,
  getHexArg,
  toRequestType,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:RequestSubmitted", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const tcrAddress = event.log.address;
  const itemId = getHexArg(event.args, "_itemID", "itemID");
  const requestIndex = getBigIntArg(event.args, "_requestIndex", "requestIndex");
  if (!itemId || requestIndex === null) return;

  const requestType = toRequestType(getBigIntArg(event.args, "_requestType", "requestType"));
  const goalContext = await context.db.find(goalContextByBudgetTcr, { id: tcrAddress });
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: goalContext?.goalTreasury ?? null,
  });
  const stakeholders = await getGoalStakeholderAccounts({
    context,
    goalTreasuryAddress: goalRow?.id ?? null,
  });
  const existingItem = await context.db.find(tcrItem, {
    id: tcrItemId(tcrAddress, itemId),
  });
  const canonicalRequester =
    requestType === "registration"
      ? ((existingItem?.submitter ?? null) as `0x${string}` | null)
      : null;

  await context.db
    .insert(tcrRequest)
    .values({
      id: tcrRequestId(tcrAddress, itemId, requestIndex),
      tcrAddress,
      itemId,
      requestIndex,
      goalTreasury: goalContext?.goalTreasury ?? null,
      requestType,
      requester: canonicalRequester,
      submittedAt: event.block.timestamp,
      txHash: event.transaction.hash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: goalContext?.goalTreasury ?? null,
      requestType,
      requester: canonicalRequester,
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
      itemId,
      goalTreasury: goalContext?.goalTreasury ?? null,
      latestRequestIndex: requestIndex,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: goalContext?.goalTreasury ?? null,
      latestRequestIndex: requestIndex,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  if (requestType === "unknown" || !goalRow) return;

  const reason =
    requestType === "registration" ? "budget_proposed" : "budget_removal_requested";
  const recipients = collectRecipientRoles({
    goalOwner: (goalRow.owner ?? null) as `0x${string}` | null,
    stakeholderAccounts: stakeholders,
    requestActors: [
      { address: canonicalRequester, role: "requester" },
      {
        address: (existingItem?.submitter ?? null) as `0x${string}` | null,
        role: "submitter",
      },
    ],
  });

  await emitProtocolNotifications({
    context,
    event,
    notifications: recipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason,
      sourceType: "budget_request",
      sourceId: `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}:${reason}`,
      actorWalletAddress: canonicalRequester,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason,
        itemId,
        requestIndex,
        actorWalletAddress: canonicalRequester,
      }),
    })),
  });
});
