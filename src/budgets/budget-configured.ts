import { ponder } from "ponder:registry";
import { budgetTreasury, stakeVault } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:BudgetConfigured", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });

  const treasury = event.log.address;

  // Upsert budget treasury aggregate state.
  await context.db
    .insert(budgetTreasury)
    .values({
      id: treasury,
      controller: event.args.controller,
      childFlow: event.args.flow,
      stakeVault: event.args.stakeVault,
      fundingDeadline: event.args.fundingDeadline,
      executionDuration: event.args.executionDuration,
      activationThreshold: event.args.activationThreshold,
      runwayCap: event.args.runwayCap,
      state: null,
      finalized: false,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        controller: event.args.controller,
        childFlow: event.args.flow,
        stakeVault: event.args.stakeVault,
        fundingDeadline: event.args.fundingDeadline,
        executionDuration: event.args.executionDuration,
        activationThreshold: event.args.activationThreshold,
        runwayCap: event.args.runwayCap,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });

  // Ensure stake vault aggregate exists and is linked.
  await context.db
    .insert(stakeVault)
    .values({
      id: event.args.stakeVault,
      kind: "budget",
      treasury,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        kind: "budget",
        treasury,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
});
