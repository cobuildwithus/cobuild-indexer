import { ponder } from "ponder:registry";

import { juror } from "ponder:schema";
import { jurorId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:JurorSlashed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });

  const vault = event.log.address;
  const jurorAddress = event.args.juror;
  const appliedWeight = event.args.appliedWeight;
  const blockNumber = event.block.number;
  const blockTimestamp = event.block.timestamp;
  const id = jurorId(vault, jurorAddress);

  await context.db
    .insert(juror)
    .values({
      id,
      vault,
      jurorAddress,
      slashedTotal: 0n,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoNothing();

  await context.db
    .update(juror, { id })
    .set((row) => ({
      slashedTotal: row.slashedTotal + appliedWeight,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    }));
});
