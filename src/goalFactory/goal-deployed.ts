import { ponder } from "ponder:registry";

import {
  goalContextByBudgetStakeLedger,
  goalContextByBudgetTcr,
  goalFactoryDeployment,
} from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

function goalFactoryDeploymentId(args: { chainId: number; goalRevnetId: bigint }): string {
  return `${args.chainId}:${args.goalRevnetId.toString()}`;
}

ponder.on("GoalFactory:GoalDeployed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalFactory" });

  const stack = event.args.stack;
  const upsertValues = {
    goalFactory: event.log.address,
    caller: event.args.caller,
    goalToken: stack.goalToken,
    goalSuperToken: stack.goalSuperToken,
    goalTreasury: stack.goalTreasury,
    goalFlow: stack.goalFlow,
    stakeVault: stack.stakeVault,
    budgetStakeLedger: stack.budgetStakeLedger,
    splitHook: stack.splitHook,
    jurorSlasherRouter: stack.jurorSlasherRouter,
    underwriterSlasherRouter: stack.underwriterSlasherRouter,
    successResolver: stack.successResolver,
    budgetTcr: stack.budgetTCR,
    arbitrator: stack.arbitrator,
    txHash: event.transaction.hash,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  };

  await context.db
    .insert(goalFactoryDeployment)
    .values({
      id: goalFactoryDeploymentId({
        chainId: context.chain.id,
        goalRevnetId: event.args.goalRevnetId,
      }),
      chainId: context.chain.id,
      goalRevnetId: event.args.goalRevnetId,
      ...upsertValues,
    })
    .onConflictDoUpdate(upsertValues);

  await context.db
    .insert(goalContextByBudgetTcr)
    .values({
      id: stack.budgetTCR,
      goalTreasury: stack.goalTreasury,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: stack.goalTreasury,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(goalContextByBudgetStakeLedger)
    .values({
      id: stack.budgetStakeLedger,
      goalTreasury: stack.goalTreasury,
      budgetTcr: stack.budgetTCR,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: stack.goalTreasury,
      budgetTcr: stack.budgetTCR,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
