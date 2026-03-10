import { ponder } from "ponder:registry";

import { juror } from "ponder:schema";
import { jurorId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:JurorExitRequested", async ({ event, context }) => {
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
      exitTime: event.args.availableAt,
      lockedGoalAmount: 0n,
      currentJurorWeight: 0n,
      slashedTotal: 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.update(juror, { id }).set({
      optedIn: true,
      exitTime: event.args.availableAt,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
