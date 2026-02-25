import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:RequestEvidenceGroupID", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });
});
