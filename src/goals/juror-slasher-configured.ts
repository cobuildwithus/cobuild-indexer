import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { goalTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:JurorSlasherConfigured", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  await context.db.sql
    .update(goalTreasury)
    .set({
      jurorSlasher: event.args.slasher,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(goalTreasury.id, event.log.address));
});
