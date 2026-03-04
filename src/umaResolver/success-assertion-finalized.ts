import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("UMATreasurySuccessResolver:SuccessAssertionFinalized", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "UMATreasurySuccessResolver" });
});
