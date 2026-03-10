import { ponder } from "ponder:registry";

import { budgetStack, goalContextByBudgetTcr, tcrItem, tcrRequest } from "ponder:schema";
import { tcrItemId, tcrRequestId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getGoalRow,
  getGoalStakeholderAccounts,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetStackActivationQueued", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const tcrAddress = event.log.address;
  const itemId = event.args.itemID;

  await context.db
    .insert(budgetStack)
    .values({
      id: itemId,
      status: "ACTIVATION_QUEUED",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      status: "ACTIVATION_QUEUED",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
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
  const requester = existingRequest?.requester ?? null;
  const recipients = collectRecipientRoles({
    goalOwner: (goalRow.owner ?? null) as `0x${string}` | null,
    stakeholderAccounts: stakeholders,
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
      reason: "budget_accepted",
      sourceType: "budget_request",
      sourceId: `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}:budget_accepted`,
      actorWalletAddress: requester as `0x${string}` | null,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "budget_accepted",
        itemId,
        requestIndex,
        actorWalletAddress: requester as `0x${string}` | null,
      }),
    })),
  });
});
