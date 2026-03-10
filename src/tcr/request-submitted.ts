import { ponder } from "ponder:registry";
import {
  budgetTreasury as budgetTreasuryTable,
  budgetTreasuryByRecipient,
  goalContextByBudgetTcr,
  tcrItem,
  tcrRequest,
} from "ponder:schema";
import { tcrItemId, tcrRequestId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBudgetUnderwriterAccounts,
  getBigIntArg,
  getGoalRow,
  getGoalStakeholderAccounts,
  getHexArg,
  toRequestType,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCRProtocolEvents:RequestSubmitted", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const tcrAddress = event.log.address;
  const itemId = getHexArg(event.args, "_itemID", "itemID");
  const requestIndex = getBigIntArg(event.args, "_requestIndex", "requestIndex");
  if (!itemId || requestIndex === null) return;

  const requestType = toRequestType(getBigIntArg(event.args, "_requestType", "requestType"));
  const requester = getHexArg(event.args, "_requester", "requester");
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
  const budgetLink =
    requestType === "clearing"
      ? await context.db.find(budgetTreasuryByRecipient, { id: itemId })
      : null;
  const budgetTreasuryAddress = (budgetLink?.budgetTreasury ?? null) as `0x${string}` | null;
  const budgetRow =
    requestType === "clearing" && budgetTreasuryAddress
      ? await context.db.find(budgetTreasuryTable, { id: budgetTreasuryAddress })
      : null;

  await context.db
    .insert(tcrRequest)
    .values({
      id: tcrRequestId(tcrAddress, itemId, requestIndex),
      tcrAddress,
      tcrKind: "budget",
      itemId,
      requestIndex,
      goalTreasury: goalContext?.goalTreasury ?? null,
      budgetTreasury: budgetTreasuryAddress,
      requestType,
      requester,
      submittedAt: event.block.timestamp,
      txHash: event.transaction.hash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: goalContext?.goalTreasury ?? null,
      tcrKind: "budget",
      budgetTreasury: budgetTreasuryAddress,
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
      tcrKind: "budget",
      itemId,
      goalTreasury: goalContext?.goalTreasury ?? null,
      budgetTreasury: budgetTreasuryAddress,
      latestRequestIndex: requestIndex,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: goalContext?.goalTreasury ?? null,
      tcrKind: "budget",
      budgetTreasury: budgetTreasuryAddress,
      latestRequestIndex: requestIndex,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  if (requestType === "unknown" || !goalRow) return;

  const reason =
    requestType === "registration" ? "budget_proposed" : "budget_removal_requested";
  const budgetUnderwriters =
    requestType === "clearing"
      ? await getBudgetUnderwriterAccounts({
          context,
          budgetTreasuryAddress,
        })
      : [];
  const recipients = collectRecipientRoles({
    goalOwner: (goalRow.owner ?? null) as `0x${string}` | null,
    budgetController: (budgetRow?.controller ?? null) as `0x${string}` | null,
    stakeholderAccounts: stakeholders,
    budgetUnderwriterAccounts: budgetUnderwriters,
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
      sourceType: "budget_request",
      sourceId: `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}:${reason}`,
      actorWalletAddress: requester,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason,
        itemId,
        requestIndex,
        budgetTreasury: budgetTreasuryAddress,
        actorWalletAddress: requester,
      }),
    })),
  });
});
