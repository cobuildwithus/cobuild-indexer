import { ponder } from "ponder:registry";

import { stakePosition, stakeVault } from "ponder:schema";
import { stakePositionId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:CobuildWithdrawn", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });

  const vault = event.log.address;
  const amount = event.args.amount;
  const blockNumber = event.block.number;
  const blockTimestamp = event.block.timestamp;
  const posId = stakePositionId(vault, event.args.user, "cobuild");

  await context.db
    .insert(stakeVault)
    .values({
      id: vault,
      kind: "goal",
      cobuildTotalWithdrawn: 0n,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoNothing();

  await context.db
    .update(stakeVault, { id: vault })
    .set((row) => ({
      kind: "goal",
      cobuildTotalWithdrawn: row.cobuildTotalWithdrawn + amount,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    }));

  await context.db
    .insert(stakePosition)
    .values({
      id: posId,
      vault,
      account: event.args.user,
      tokenKind: "cobuild",
      staked: 0n,
      withdrawn: 0n,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoNothing();

  await context.db
    .update(stakePosition, { id: posId })
    .set((row) => ({
      withdrawn: row.withdrawn + amount,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    }));
});
