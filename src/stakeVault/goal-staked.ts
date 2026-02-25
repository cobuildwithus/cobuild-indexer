import { ponder } from "ponder:registry";
import { sql } from "drizzle-orm";

import { stakePosition, stakeVault } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { stakePositionId } from "../helpers/ids";

async function handleGoalStaked(args: { event: any; context: any; kind: "goal" | "budget"; contractName: string }) {
  const { event, context, kind, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const vault = event.log.address;

  // Upsert vault totals.
  await context.db
    .insert(stakeVault)
    .values({
      id: vault,
      kind,
      goalTotalStaked: event.args.totalStaked,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        kind,
        goalTotalStaked: event.args.totalStaked,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });

  // Upsert per-account position (increment staked).
  const posId = stakePositionId(vault, event.args.account, "goal");
  await context.db
    .insert(stakePosition)
    .values({
      id: posId,
      vault,
      account: event.args.account,
      tokenKind: "goal",
      staked: event.args.amount,
      withdrawn: 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        staked: sql`${stakePosition.staked} + ${event.args.amount}`,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalStakeVault:GoalStaked", async ({ event, context }) => {
  await handleGoalStaked({ event, context, kind: "goal", contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:GoalStaked", async ({ event, context }) => {
  await handleGoalStaked({ event, context, kind: "budget", contractName: "BudgetStakeVault" });
});
