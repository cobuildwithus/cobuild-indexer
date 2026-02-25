import { ponder } from "ponder:registry";
import { allocationCheckpoint } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetStakeLedger:AllocationCheckpointed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetStakeLedger" });

  await context.db
    .insert(allocationCheckpoint)
    .values({
      id: event.id,
      account: event.args.account,
      budget: event.args.budget,
      allocatedStake: event.args.allocatedStake,
      checkpointTimestamp: event.args.timestamp,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
