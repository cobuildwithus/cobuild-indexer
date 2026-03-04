import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("UnderwriterSlasherRouter:CobuildConversionFailed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "UnderwriterSlasherRouter" });
});
