import { eq, sql } from "drizzle-orm";
import { ponder } from "ponder:registry";

import { premiumAccount, premiumClaim } from "ponder:schema";
import { premiumAccountId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:Claimed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  const escrow = event.log.address;
  const account = event.args.account;
  const id = premiumAccountId(escrow, account);

  const [existingClaim] = await context.db.sql
    .select({ id: premiumClaim.id })
    .from(premiumClaim)
    .where(eq(premiumClaim.id, event.id))
    .limit(1);

  if (existingClaim) return;

  await context.db
    .insert(premiumClaim)
    .values({
      escrow,
      account,
      id: event.id,
      to: event.args.to,
      amount: event.args.amount,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db
    .insert(premiumAccount)
    .values({
      id,
      escrow,
      account,
      claimableAmount: 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.sql
    .update(premiumAccount)
    .set({
      claimableAmount: sql`GREATEST(${premiumAccount.claimableAmount} - ${event.args.amount}, 0)`,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(premiumAccount.id, id));
});
