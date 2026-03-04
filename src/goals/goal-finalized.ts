import { ponder } from "ponder:registry";

import { goalTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:GoalFinalized", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });
  const finalState = Number(event.args.finalState);
  await context.db
    .update(goalTreasury, { id: event.log.address })
    .set({
      state: finalState,
      finalized: true,
      ...(finalState === 2 ? { successAt: event.block.timestamp } : {}),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
