import { ponder } from "ponder:registry";

import { juror } from "ponder:schema";
import { jurorId } from "../helpers/ids";
import { syncStakeVaultJurorAudience } from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:JurorOptedIn", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });

  const vault = event.log.address;
  const jurorAddress = event.args.juror;
  const id = jurorId(vault, jurorAddress);

  await context.db
    .insert(juror)
    .values({
      id,
      vault,
      jurorAddress,
      optedIn: false,
      exitTime: null,
      delegate: null,
      slasher: null,
      lockedGoalAmount: 0n,
      currentJurorWeight: 0n,
      slashedTotal: 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.update(juror, { id }).set((row) => ({
    optedIn: true,
    exitTime: null,
    delegate: event.args.delegate,
    lockedGoalAmount: row.lockedGoalAmount + event.args.goalAmount,
    currentJurorWeight: row.currentJurorWeight + event.args.weightDelta,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  }));

  await syncStakeVaultJurorAudience({
    context,
    stakeVaultAddress: vault,
    jurorAddress,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});
