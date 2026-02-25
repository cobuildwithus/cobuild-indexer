import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { goalTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:StateTransition", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  await context.db.sql
    .update(goalTreasury)
    .set({
      state: Number(event.args.toState),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(goalTreasury.id, event.log.address));
});
