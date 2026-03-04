import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("JurorSlasherRouter:SlasherAuthorizationSet", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "JurorSlasherRouter" });
});
