import { ponder } from "ponder:registry";

import { juror } from "ponder:schema";
import { jurorId } from "../helpers/ids";
import { syncStakeVaultJurorAudience } from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:JurorExitFinalized", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });

  const vault = event.log.address;
  const jurorAddress = event.args.juror;
  const id = jurorId(vault, jurorAddress);
  const existingJuror = await context.db.find(juror, { id });
  const nextLockedGoalAmount = BigInt(existingJuror?.lockedGoalAmount ?? 0n) - event.args.goalAmount;
  const nextJurorWeight = BigInt(existingJuror?.currentJurorWeight ?? 0n) - event.args.weightDelta;

  await context.db
    .insert(juror)
    .values({
      id,
      vault,
      jurorAddress,
      optedIn: false,
      exitTime: null,
      lockedGoalAmount: 0n,
      currentJurorWeight: 0n,
      slashedTotal: 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.update(juror, { id }).set({
      optedIn: nextJurorWeight > 0n,
      exitTime: null,
      lockedGoalAmount: nextLockedGoalAmount > 0n ? nextLockedGoalAmount : 0n,
      currentJurorWeight: nextJurorWeight > 0n ? nextJurorWeight : 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await syncStakeVaultJurorAudience({
    context,
    stakeVaultAddress: vault,
    jurorAddress,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});
