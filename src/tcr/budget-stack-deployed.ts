import { ponder } from "ponder:registry";
import { budgetStack } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetStackDeployed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  await context.db
    .insert(budgetStack)
    .values({
      id: event.args.itemID,
      childFlow: event.args.childFlow,
      budgetTreasury: event.args.budgetTreasury,
      stakeVault: event.args.stakeVault,
      strategy: event.args.strategy,
      status: "DEPLOYED",
      deployedAtBlock: event.block.number,
      deployedAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        childFlow: event.args.childFlow,
        budgetTreasury: event.args.budgetTreasury,
        stakeVault: event.args.stakeVault,
        strategy: event.args.strategy,
        status: "DEPLOYED",
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
});
