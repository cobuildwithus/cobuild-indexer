import { ponder } from "ponder:registry";

import { premiumAccount } from "ponder:schema";
import { premiumAccountId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:UnderwriterSlashed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  const escrow = event.log.address;
  const account = event.args.underwriter;

  await context.db
    .insert(premiumAccount)
    .values({
      id: premiumAccountId(escrow, account),
      escrow,
      account,
      slashed: true,
      exposureIntegral: event.args.exposureIntegral,
      lastSlashWeight: event.args.slashWeight,
      lastSlashDuration: event.args.duration,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      slashed: true,
      exposureIntegral: event.args.exposureIntegral,
      lastSlashWeight: event.args.slashWeight,
      lastSlashDuration: event.args.duration,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
