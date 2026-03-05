import { ponder } from "ponder:registry";

import { budgetStack } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { upsertBudgetStackStatus } from "./budget-stack-status";

ponder.on("BudgetTCR:BudgetStackRemovalQueued", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  await upsertBudgetStackStatus({
    db: context.db,
    table: budgetStack,
    itemId: event.args.itemID,
    status: "REMOVAL_QUEUED",
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});
