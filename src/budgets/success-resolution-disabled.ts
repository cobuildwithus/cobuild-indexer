import { ponder } from "ponder:registry";

import { budgetTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:SuccessResolutionDisabled", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });

  const existingBudgetTreasury = await context.db.find(budgetTreasury, { id: event.log.address });
  if (!existingBudgetTreasury) return;

  await context.db
    .update(budgetTreasury, { id: event.log.address })
    .set({
      successResolutionDisabled: true,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
