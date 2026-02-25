import { ponder } from "ponder:registry";
import { sql } from "drizzle-orm";

import { stakePosition, stakeVault } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { stakePositionId } from "../helpers/ids";

async function handleCobuildWithdrawn(args: { event: any; context: any; kind: "goal" | "budget"; contractName: string }) {
  const { event, context, kind, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const vault = event.log.address;

  await context.db
    .insert(stakeVault)
    .values({
      id: vault,
      kind,
      cobuildTotalWithdrawn: event.args.totalWithdrawn,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        kind,
        cobuildTotalWithdrawn: event.args.totalWithdrawn,
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
      staked: 0n,
      withdrawn: event.args.amount,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        withdrawn: sql`${stakePosition.withdrawn} + ${event.args.amount}`,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalStakeVault:CobuildWithdrawn", async ({ event, context }) => {
  await handleCobuildWithdrawn({ event, context, kind: "goal", contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:CobuildWithdrawn", async ({ event, context }) => {
  await handleCobuildWithdrawn({ event, context, kind: "budget", contractName: "BudgetStakeVault" });
});
