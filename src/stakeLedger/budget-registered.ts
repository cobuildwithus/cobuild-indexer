import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import {
  budgetStack,
  budgetTreasury,
  budgetTreasuryByChildFlow,
  budgetTreasuryByRecipient,
  flow,
  flowRecipient,
  goalContextByBudgetTreasury,
  goalContextByBudgetStakeLedger,
  tcrItem,
  tcrRequest,
} from "ponder:schema";
import { flowRecipientKey, tcrItemId, tcrRequestId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getGoalRow,
  getGoalStakeholderAccounts,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetStakeLedger:BudgetRegistered", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetStakeLedger" });

  const recipientId = event.args.recipientId as Hex;
  const budgetTreasuryId = event.args.budget as Hex;

  await context.db.update(budgetStack, { id: recipientId }).set({
    budgetTreasury: budgetTreasuryId,
    status: "ACTIVE",
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });

  await context.db.update(budgetTreasury, { id: budgetTreasuryId }).set({
    recipientId,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });

  const budget = await context.db.find(budgetTreasury, { id: budgetTreasuryId });
  const childFlowId = budget?.childFlow as Hex | null;

  await context.db
    .insert(budgetTreasuryByRecipient)
    .values({
      id: recipientId,
      budgetTreasury: budgetTreasuryId,
      childFlow: childFlowId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      budgetTreasury: budgetTreasuryId,
      childFlow: childFlowId,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  if (childFlowId) {
    await context.db
      .insert(budgetTreasuryByChildFlow)
      .values({
        id: childFlowId,
        budgetTreasury: budgetTreasuryId,
        recipientId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        budgetTreasury: budgetTreasuryId,
        recipientId,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });

    const childFlow = await context.db.find(flow, { id: childFlowId });
    if (childFlow?.parentFlow) {
      await context.db
        .update(flowRecipient, { id: flowRecipientKey(childFlow.parentFlow as Hex, recipientId) })
        .set({
          budgetTreasury: budgetTreasuryId,
          updatedAtBlock: event.block.number,
          updatedAtTimestamp: event.block.timestamp,
        });
    }
  }

  const goalContext = await context.db.find(goalContextByBudgetStakeLedger, {
    id: event.log.address,
  });
  const budgetTcr = (goalContext?.budgetTcr ?? null) as Hex | null;
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: goalContext?.goalTreasury ?? null,
  });
  if (!goalRow || !budgetTcr) return;

  await context.db
    .insert(goalContextByBudgetTreasury)
    .values({
      id: budgetTreasuryId,
      goalTreasury: goalRow.id,
      stakeVault: goalRow.stakeVault,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: goalRow.id,
      stakeVault: goalRow.stakeVault,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const existingItem = await context.db.find(tcrItem, {
    id: tcrItemId(budgetTcr, recipientId),
  });
  const requestIndex = BigInt(existingItem?.latestRequestIndex ?? -1);
  if (requestIndex < 0n) return;

  const existingRequest = await context.db.find(tcrRequest, {
    id: tcrRequestId(budgetTcr, recipientId, requestIndex),
  });
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
      reason: "budget_activated",
      sourceType: "budget_request",
      sourceId: `${budgetTcr.toLowerCase()}:${recipientId.toLowerCase()}:${requestIndex.toString()}:budget_activated`,
      actorWalletAddress: requester as `0x${string}` | null,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "budget_activated",
        itemId: recipientId,
        requestIndex,
        budgetTreasury: budgetTreasuryId,
        actorWalletAddress: requester as `0x${string}` | null,
      }),
    })),
  });
});
