import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import {
  budgetStack,
  budgetTreasury,
  budgetTreasuryByChildFlow,
  budgetTreasuryByRecipient,
  flow,
  flowRecipient,
} from "ponder:schema";
import { flowRecipientKey } from "../helpers/ids";
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

  if (!childFlowId) return;

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
  if (!childFlow?.parentFlow) return;

  await context.db.update(flowRecipient, { id: flowRecipientKey(childFlow.parentFlow as Hex, recipientId) }).set({
    budgetTreasury: budgetTreasuryId,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });
});
