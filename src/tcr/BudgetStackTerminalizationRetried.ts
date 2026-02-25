import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { budgetStack } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetStackTerminalizationRetried", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  await context.db.sql
    .update(budgetStack)
    .set({
      status: event.args.terminallyResolved ? "TERMINALIZED" : "TERMINALIZATION_RETRIED",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(budgetStack.id, event.args.itemID));
});
