import { ponder } from "ponder:registry";

import { stakeVault } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:GoalResolved", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });

  await context.db
    .insert(stakeVault)
    .values({
      id: event.log.address,
      kind: "goal",
      resolved: true,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      kind: "goal",
      resolved: true,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
