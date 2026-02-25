import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:BudgetTreasuryCallFailed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });
});
