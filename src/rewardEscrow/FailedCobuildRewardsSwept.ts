import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("RewardEscrow:FailedCobuildRewardsSwept", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "RewardEscrow" });
});
