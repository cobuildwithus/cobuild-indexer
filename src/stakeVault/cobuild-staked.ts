import { ponder } from "ponder:registry";
import { sql } from "drizzle-orm";

import { stakePosition, stakeVault } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { stakePositionId } from "../helpers/ids";

async function handleCobuildStaked(args: { event: any; context: any; kind: "goal" | "budget"; contractName: string }) {
  const { event, context, kind, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const vault = event.log.address;

  await context.db
    .insert(stakeVault)
    .values({
      id: vault,
      kind,
      cobuildTotalStaked: event.args.totalStaked,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        kind,
        cobuildTotalStaked: event.args.totalStaked,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });

  const posId = stakePositionId(vault, event.args.account, "cobuild");
  await context.db
    .insert(stakePosition)
    .values({
      id: posId,
      vault,
      account: event.args.account,
      tokenKind: "cobuild",
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

ponder.on("GoalStakeVault:CobuildStaked", async ({ event, context }) => {
  await handleCobuildStaked({ event, context, kind: "goal", contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:CobuildStaked", async ({ event, context }) => {
  await handleCobuildStaked({ event, context, kind: "budget", contractName: "BudgetStakeVault" });
});
