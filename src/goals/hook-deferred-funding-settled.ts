import { ponder } from "ponder:registry";
import { hookFunding } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:HookDeferredFundingSettled", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  await context.db
    .insert(hookFunding)
    .values({
      id: event.id,
      goalTreasury: event.log.address,
      kind: "SETTLED",
      amount: event.args.superTokenAmount,
      superTokenAmount: event.args.superTokenAmount,
      controllerBurnAmount: event.args.controllerBurnAmount,
      finalState: Number(event.args.finalState),
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});
