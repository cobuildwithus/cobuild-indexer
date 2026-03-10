import { ponder } from "ponder:registry";

import { juror } from "ponder:schema";
import { jurorId } from "../helpers/ids";
import { syncStakeVaultJurorAudience } from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:JurorDelegateSet", async ({ event, context }) => {
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
      delegate: null,
      lockedGoalAmount: 0n,
      currentJurorWeight: 0n,
      slashedTotal: 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.update(juror, { id }).set({
      delegate: event.args.delegate,
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
