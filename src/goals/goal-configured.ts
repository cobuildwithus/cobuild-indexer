import { ponder } from "ponder:registry";
import { goalTreasury, stakeVault } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:GoalConfigured", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  const treasury = event.log.address;

  await context.db
    .insert(goalTreasury)
    .values({
      id: treasury,
      owner: event.args.owner,
      flowAddress: event.args.flow,
      stakeVault: event.args.stakeVault,
      budgetStakeLedger: event.args.budgetStakeLedger,
      hook: event.args.hook,
      goalRulesets: event.args.goalRulesets,
      goalRevnetId: event.args.goalRevnetId,
      minRaiseDeadline: event.args.minRaiseDeadline,
      deadline: event.args.deadline,
      minRaise: event.args.minRaise,
      state: null,
      finalized: false,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      owner: event.args.owner,
      flowAddress: event.args.flow,
      stakeVault: event.args.stakeVault,
      budgetStakeLedger: event.args.budgetStakeLedger,
      hook: event.args.hook,
      goalRulesets: event.args.goalRulesets,
      goalRevnetId: event.args.goalRevnetId,
      minRaiseDeadline: event.args.minRaiseDeadline,
      deadline: event.args.deadline,
      minRaise: event.args.minRaise,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(stakeVault)
    .values({
      id: event.args.stakeVault,
      kind: "goal",
      treasury,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      kind: "goal",
      treasury,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
