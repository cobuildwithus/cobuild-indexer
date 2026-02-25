import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:MetaEvidence", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });
});
