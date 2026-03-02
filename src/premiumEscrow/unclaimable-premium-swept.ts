import { ponder } from "ponder:registry";

import { premiumEscrow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:UnclaimablePremiumSwept", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  await context.db
    .insert(premiumEscrow)
    .values({
      id: event.log.address,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
