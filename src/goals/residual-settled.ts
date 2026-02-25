import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";
import { goalTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:ResidualSettled", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  await context.db.sql
    .update(goalTreasury)
    .set({
      lastResidualFinalState: Number(event.args.finalState),
      lastResidualSettledAmount: event.args.totalSettled,
      lastResidualRewardEscrowAmount: event.args.rewardEscrowAmount,
      lastResidualControllerBurnAmount: event.args.controllerBurnAmount,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(goalTreasury.id, event.log.address));
});
