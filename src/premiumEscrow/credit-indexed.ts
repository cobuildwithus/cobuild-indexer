import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:CreditIndexed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });
});
