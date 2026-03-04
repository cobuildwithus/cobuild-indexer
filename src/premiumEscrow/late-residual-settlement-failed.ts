import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:LateResidualSettlementFailed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });
});
