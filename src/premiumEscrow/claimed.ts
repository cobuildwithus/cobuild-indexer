import { ponder } from "ponder:registry";

import { premiumAccount, premiumClaim } from "ponder:schema";
import { premiumAccountId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:Claimed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  const escrow = event.log.address;
  const account = event.args.account;
  const amount = event.args.amount;
  const blockNumber = event.block.number;
  const blockTimestamp = event.block.timestamp;
  const id = premiumAccountId(escrow, account);

  const existingClaim = await context.db.find(premiumClaim, { id: event.id });

  if (existingClaim) return;

  await context.db
    .insert(premiumClaim)
    .values({
      escrow,
      account,
      id: event.id,
      to: event.args.to,
      amount,
      txHash: event.transaction.hash,
      blockNumber,
      timestamp: blockTimestamp,
    })
    .onConflictDoNothing();

  await context.db
    .insert(premiumAccount)
    .values({
      id,
      escrow,
      account,
      claimableAmount: 0n,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoNothing();

  await context.db
    .update(premiumAccount, { id })
    .set((row) => ({
      claimableAmount: row.claimableAmount > amount ? row.claimableAmount - amount : 0n,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    }));
});
