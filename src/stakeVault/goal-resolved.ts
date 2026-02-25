import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { stakeVault } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleGoalResolved(args: { event: any; context: any; contractName: string; kind: "goal" | "budget" }) {
  const { event, context, contractName, kind } = args;
  await insertProtocolEvent({ context, event, contractName });

  await context.db
    .insert(stakeVault)
    .values({
      id: event.log.address,
      kind,
      resolved: true,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        kind,
        resolved: true,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalStakeVault:GoalResolved", async ({ event, context }) => {
  await handleGoalResolved({ event, context, contractName: "GoalStakeVault", kind: "goal" });
});

ponder.on("BudgetStakeVault:GoalResolved", async ({ event, context }) => {
  await handleGoalResolved({ event, context, contractName: "BudgetStakeVault", kind: "budget" });
});
