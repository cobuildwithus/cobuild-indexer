import { ponder } from "ponder:registry";

import { premiumEscrow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:ManagerRewardPoolConnected", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  await context.db
    .insert(premiumEscrow)
    .values({
      id: event.log.address,
      managerRewardPool: event.args.pool,
      baselineReceived: event.args.baselineReceived,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      managerRewardPool: event.args.pool,
      baselineReceived: event.args.baselineReceived,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
