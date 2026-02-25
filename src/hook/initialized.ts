import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalRevnetSplitHook:Initialized", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalRevnetSplitHook" });
});
