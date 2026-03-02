import { ponder } from "ponder:registry";

import { premiumEscrow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:Closed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  await context.db
    .insert(premiumEscrow)
    .values({
      id: event.log.address,
      closed: true,
      finalState: Number(event.args.finalState),
      activatedAt: event.args.activatedAt,
      closedAt: event.args.closedAt,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      closed: true,
      finalState: Number(event.args.finalState),
      activatedAt: event.args.activatedAt,
      closedAt: event.args.closedAt,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
