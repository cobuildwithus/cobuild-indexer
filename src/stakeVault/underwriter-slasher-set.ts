import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:UnderwriterSlasherSet", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });
});
