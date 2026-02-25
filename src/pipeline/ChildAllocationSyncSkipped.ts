import { ponder } from "ponder:registry";
import { pipelineSync } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalFlowAllocationLedgerPipeline:ChildAllocationSyncSkipped", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalFlowAllocationLedgerPipeline" });

  await context.db
    .insert(pipelineSync)
    .values({
      id: event.id,
      eventName: "ChildAllocationSyncSkipped",
      childRecipientId: event.args.childRecipientId,
      childFlow: event.args.childFlow,
      parentRecipientId: event.args.parentRecipientId,
      parentFlow: event.args.parentFlow,
      parentStrategy: event.args.parentStrategy,
      parentAllocationKey: event.args.parentAllocationKey,
      commitment: null,
      weight: null,
      childAllocationKey: null,
      budgetTreasury: null,
      success: null,
      reason: Number(event.args.reason),
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
