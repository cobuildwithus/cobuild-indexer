import { ponder } from "ponder:registry";

import { budgetStack } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetStackRemovalHandled", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const existingBudgetStack = await context.db.find(budgetStack, { id: event.args.itemID });
  if (!existingBudgetStack) {
    throw new Error(
      `Invariant violation: missing budget_stack row for ${event.args.itemID} on BudgetStackRemovalHandled (tx ${event.transaction.hash})`
    );
  }

  await context.db
    .update(budgetStack, { id: event.args.itemID })
    .set({
      status: event.args.terminallyResolved ? "REMOVED_TERMINAL" : "REMOVED",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
