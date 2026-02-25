import { ponder } from "ponder:registry";
import { budgetStack, budgetTreasury, stakeVault } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:BudgetConfigured", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });

  const treasury = event.log.address;

  // Upsert budget treasury aggregate state.
  await context.db
    .insert(budgetTreasury)
    .values({
      id: treasury,
      recipientId: event.args.recipientId,
      childFlow: event.args.childFlow,
      budgetOwner: event.args.budgetOwner,
      goalToken: event.args.goalToken,
      cobuildToken: event.args.cobuildToken,
      stakeVault: event.args.stakeVault,
      strategy: event.args.strategy,
      budgetStart: event.args.budgetStart,
      budgetDuration: event.args.budgetDuration,
      state: null,
      finalized: false,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        recipientId: event.args.recipientId,
        childFlow: event.args.childFlow,
        budgetOwner: event.args.budgetOwner,
        goalToken: event.args.goalToken,
        cobuildToken: event.args.cobuildToken,
        stakeVault: event.args.stakeVault,
        strategy: event.args.strategy,
        budgetStart: event.args.budgetStart,
        budgetDuration: event.args.budgetDuration,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });

  // Upsert budget stack by itemID/recipientId.
  await context.db
    .insert(budgetStack)
    .values({
      id: event.args.recipientId,
      childFlow: event.args.childFlow,
      budgetTreasury: treasury,
      stakeVault: event.args.stakeVault,
      strategy: event.args.strategy,
      status: "CONFIGURED",
      deployedAtBlock: event.block.number,
      deployedAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        childFlow: event.args.childFlow,
        budgetTreasury: treasury,
        stakeVault: event.args.stakeVault,
        strategy: event.args.strategy,
        status: "CONFIGURED",
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
