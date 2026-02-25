import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalFlow:Initialized", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:Initialized", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "ChildFlow" });
});
