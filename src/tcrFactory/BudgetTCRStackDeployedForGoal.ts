import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCRFactory:BudgetTCRStackDeployedForGoal", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCRFactory" });
});
