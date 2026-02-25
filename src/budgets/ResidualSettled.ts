import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:ResidualSettled", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });
});
