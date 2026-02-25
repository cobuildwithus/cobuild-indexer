import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { budgetStack } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetStakeLedger:BudgetRegistered", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetStakeLedger" });

  await context.db.sql
    .update(budgetStack)
    .set({
      status: "ACTIVE",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(budgetStack.id, event.args.budgetId));
});
