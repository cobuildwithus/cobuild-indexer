import { ponder } from "ponder:registry";

import { juror } from "ponder:schema";
import { jurorId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:JurorOptedIn", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });

  const vault = event.log.address;
  const jurorAddress = event.args.juror;

  await context.db
    .insert(juror)
    .values({
      id: jurorId(vault, jurorAddress),
      vault,
      jurorAddress,
      optedIn: true,
      exitTime: null,
      delegate: event.args.delegate,
      slasher: null,
      slashedTotal: 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      optedIn: true,
      exitTime: null,
      delegate: event.args.delegate,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
