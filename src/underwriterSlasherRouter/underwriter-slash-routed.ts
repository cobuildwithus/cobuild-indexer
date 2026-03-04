import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("UnderwriterSlasherRouter:UnderwriterSlashRouted", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "UnderwriterSlasherRouter" });
});
