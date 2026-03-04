import { ponder } from "ponder:registry";

import { budgetStack } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetStackActivationQueued", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  await context.db
    .insert(budgetStack)
    .values({
      id: event.args.itemID,
      status: "ACTIVATION_QUEUED",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      status: "ACTIVATION_QUEUED",
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
