import { ponder } from "ponder:registry";
import { pipelineSync } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalFlowAllocationLedgerPipeline:ChildAllocationSyncAttempted", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalFlowAllocationLedgerPipeline" });

  await context.db
    .insert(pipelineSync)
    .values({
      id: event.id,
      eventName: "ChildAllocationSyncAttempted",
      childRecipientId: event.args.childRecipientId,
      childFlow: event.args.childFlow,
      parentRecipientId: event.args.parentRecipientId,
      parentFlow: event.args.parentFlow,
      parentStrategy: event.args.parentStrategy,
      parentAllocationKey: event.args.parentAllocationKey,
      commitment: event.args.commitment,
      weight: event.args.weight,
      childAllocationKey: event.args.childAllocationKey,
      budgetTreasury: null,
      success: Boolean(event.args.success),
      reason: null,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
