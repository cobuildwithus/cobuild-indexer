import { eq, sql } from "drizzle-orm";
import { ponder } from "ponder:registry";

import { stakePosition, stakeVault } from "ponder:schema";
import { stakePositionId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:CobuildWithdrawn", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });

  const vault = event.log.address;
  const posId = stakePositionId(vault, event.args.user, "cobuild");

  await context.db
    .insert(stakeVault)
    .values({
      id: vault,
      kind: "goal",
      cobuildTotalWithdrawn: 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.sql
    .update(stakeVault)
    .set({
      kind: "goal",
      cobuildTotalWithdrawn: sql`${stakeVault.cobuildTotalWithdrawn} + ${event.args.amount}`,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(stakeVault.id, vault));

  await context.db
    .insert(stakePosition)
    .values({
      id: posId,
      vault,
      account: event.args.user,
      tokenKind: "cobuild",
      staked: 0n,
      withdrawn: 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.sql
    .update(stakePosition)
    .set({
      withdrawn: sql`${stakePosition.withdrawn} + ${event.args.amount}`,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(stakePosition.id, posId));
});
