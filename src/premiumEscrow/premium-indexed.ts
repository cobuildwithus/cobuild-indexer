import { ponder } from "ponder:registry";

import { premiumEscrow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:PremiumIndexed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  await context.db
    .insert(premiumEscrow)
    .values({
      id: event.log.address,
      latestDistributedPremium: event.args.distributedPremium,
      latestTotalCoverage: event.args.totalCoverage,
      latestPremiumIndex: event.args.newPremiumIndex,
      lastIndexedAtBlock: event.block.number,
      lastIndexedAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      latestDistributedPremium: event.args.distributedPremium,
      latestTotalCoverage: event.args.totalCoverage,
      latestPremiumIndex: event.args.newPremiumIndex,
      lastIndexedAtBlock: event.block.number,
      lastIndexedAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
