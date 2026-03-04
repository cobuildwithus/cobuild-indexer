import { ponder } from "ponder:registry";

import { budgetStack } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetStackRemovalQueued", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const existingBudgetStack = await context.db.find(budgetStack, { id: event.args.itemID });
  if (!existingBudgetStack) return;

  await context.db
    .update(budgetStack, { id: event.args.itemID })
    .set({
      status: "REMOVAL_QUEUED",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
