import { ponder } from "ponder:registry";
import { allocationCheckpoint } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetStakeLedger:AllocationCheckpointed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetStakeLedger" });

  await context.db
    .insert(allocationCheckpoint)
    .values({
      id: event.id,
      budgetId: event.args.budgetId,
      allocationKey: event.args.allocationKey,
      allocation: event.args.allocation,
      checkpointTimestamp: event.args.timestamp,
      caller: event.args.caller,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
