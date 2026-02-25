import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:TerminalSideEffectFailed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });
});
