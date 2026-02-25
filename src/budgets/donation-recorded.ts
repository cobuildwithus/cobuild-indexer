import { ponder } from "ponder:registry";
import { donation } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:DonationRecorded", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });

  await context.db
    .insert(donation)
    .values({
      id: event.id,
      kind: "budget",
      treasury: event.log.address,
      donor: event.args.donor,
      amount: event.args.superTokenAmount,
      token: event.args.sourceToken,
      sourceAmount: event.args.sourceAmount,
      superTokenAmount: event.args.superTokenAmount,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
