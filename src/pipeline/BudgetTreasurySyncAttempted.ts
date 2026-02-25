import { ponder } from "ponder:registry";
import { pipelineSync } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalFlowAllocationLedgerPipeline:BudgetTreasurySyncAttempted", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalFlowAllocationLedgerPipeline" });

  await context.db
    .insert(pipelineSync)
    .values({
      id: event.id,
      eventName: "BudgetTreasurySyncAttempted",
      childRecipientId: null,
      childFlow: null,
      parentRecipientId: event.args.parentRecipientId,
      parentFlow: event.args.parentFlow,
      parentStrategy: event.args.parentStrategy,
      parentAllocationKey: event.args.parentAllocationKey,
      commitment: null,
      weight: null,
      childAllocationKey: null,
      budgetTreasury: event.args.budgetTreasury,
      success: Boolean(event.args.success),
      reason: null,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
