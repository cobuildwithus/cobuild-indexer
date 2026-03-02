import { ponder } from "ponder:registry";

import { premiumAccount } from "ponder:schema";
import { premiumAccountId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:AccountCheckpointed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  const escrow = event.log.address;
  const account = event.args.account;

  await context.db
    .insert(premiumAccount)
    .values({
      id: premiumAccountId(escrow, account),
      escrow,
      account,
      currentCoverage: event.args.currentCoverage,
      claimableAmount: event.args.claimableAmount,
      exposureIntegral: event.args.exposureIntegral,
      lastCheckpointBlock: event.block.number,
      lastCheckpointTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      currentCoverage: event.args.currentCoverage,
      claimableAmount: event.args.claimableAmount,
      exposureIntegral: event.args.exposureIntegral,
      lastCheckpointBlock: event.block.number,
      lastCheckpointTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
