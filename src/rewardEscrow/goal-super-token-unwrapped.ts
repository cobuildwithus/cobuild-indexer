import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { rewardEscrow } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("RewardEscrow:GoalSuperTokenUnwrapped", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "RewardEscrow" });

  await context.db.sql
    .update(rewardEscrow)
    .set({
      lastUnwrapCaller: event.args.caller,
      lastUnwrapAmountIn: event.args.superTokenAmount,
      lastUnwrapAmountOut: event.args.rewardTokenAmount,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(rewardEscrow.id, event.log.address));
});
