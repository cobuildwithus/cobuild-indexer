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
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:Dispute", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const tcrAddress = event.log.address;
  const itemId = getHexArg(event.args, "_itemID", "itemID");
  const disputeId = getBigIntArg(event.args, "_disputeID", "disputeID");
  if (!itemId || disputeId === null) return;

  const existingItem = await context.db.find(tcrItem, {
    id: tcrItemId(tcrAddress, itemId),
  });
  const requestIndex = BigInt(existingItem?.latestRequestIndex ?? -1);
  if (requestIndex < 0n) return;

  const requestId = tcrRequestId(tcrAddress, itemId, requestIndex);
  const existingRequest = await context.db.find(tcrRequest, { id: requestId });
  const goalContext = await context.db.find(goalContextByBudgetTcr, { id: tcrAddress });
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: existingRequest?.goalTreasury ?? goalContext?.goalTreasury ?? null,
  });
  if (!goalRow) return;

  const stakeholders = await getGoalStakeholderAccounts({
    context,
    goalTreasuryAddress: goalRow.id,
  });

  await context.db
    .insert(tcrRequest)
    .values({
      id: requestId,
      tcrAddress,
      itemId,
      requestIndex,
      goalTreasury: goalRow.id,
      requestType: existingRequest?.requestType ?? "unknown",
      requester: existingRequest?.requester ?? null,
      challenger: existingRequest?.challenger ?? null,
      disputeId,
      challengedAt: event.block.timestamp,
      txHash: event.transaction.hash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: goalRow.id,
      requester: existingRequest?.requester ?? null,
      challenger: existingRequest?.challenger ?? null,
      disputeId,
      challengedAt: event.block.timestamp,
      txHash: event.transaction.hash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const reason =
    existingRequest?.requestType === "clearing"
      ? "budget_removal_challenged"
      : "budget_proposal_challenged";
  const recipients = collectRecipientRoles({
    goalOwner: (goalRow.owner ?? null) as `0x${string}` | null,
    stakeholderAccounts: stakeholders,
    requestActors: [
      {
        address: (existingRequest?.requester ?? null) as `0x${string}` | null,
        role: "requester",
      },
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
      actorWalletAddress: null,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason,
        itemId,
        requestIndex,
        actorWalletAddress: null,
      }),
    })),
  });
});
