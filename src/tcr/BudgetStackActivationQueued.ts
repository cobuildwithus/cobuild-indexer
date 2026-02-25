import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { budgetStack } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetStackActivationQueued", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  await context.db.sql
    .update(budgetStack)
    .set({
      status: "ACTIVATION_QUEUED",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(budgetStack.id, event.args.itemID));
});
