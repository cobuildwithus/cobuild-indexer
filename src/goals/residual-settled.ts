import { ponder } from "ponder:registry";
import { goalTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:ResidualSettled", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });
  await context.db
    .update(goalTreasury, { id: event.log.address })
    .set({
      lastResidualFinalState: Number(event.args.finalState),
      lastResidualSettledAmount: event.args.totalSettled,
      lastResidualControllerBurnAmount: event.args.controllerBurnAmount,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
