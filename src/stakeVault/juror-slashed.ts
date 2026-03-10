import { ponder } from "ponder:registry";

import { juror } from "ponder:schema";
import { jurorId } from "../helpers/ids";
import { syncStakeVaultJurorAudience } from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:JurorSlashed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });

  const vault = event.log.address;
  const jurorAddress = event.args.juror;
  const appliedWeight = event.args.appliedWeight;
  const blockNumber = event.block.number;
  const blockTimestamp = event.block.timestamp;
  const id = jurorId(vault, jurorAddress);
  const existingJuror = await context.db.find(juror, { id });
  const nextLockedGoalAmount = BigInt(existingJuror?.lockedGoalAmount ?? 0n) - event.args.goalAmount;
  const nextJurorWeight = BigInt(existingJuror?.currentJurorWeight ?? 0n) - appliedWeight;
  const nextSlashedTotal = BigInt(existingJuror?.slashedTotal ?? 0n) + appliedWeight;

  await context.db
    .insert(juror)
    .values({
      id,
      vault,
      jurorAddress,
      lockedGoalAmount: 0n,
      currentJurorWeight: 0n,
      slashedTotal: 0n,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoNothing();

  await context.db.update(juror, { id }).set({
    optedIn: nextJurorWeight > 0n,
    lockedGoalAmount: nextLockedGoalAmount > 0n ? nextLockedGoalAmount : 0n,
    currentJurorWeight: nextJurorWeight > 0n ? nextJurorWeight : 0n,
    slashedTotal: nextSlashedTotal,
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  });

  await syncStakeVaultJurorAudience({
    context,
    stakeVaultAddress: vault,
    jurorAddress,
    blockNumber,
    blockTimestamp,
  });
});
