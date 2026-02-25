import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("SingleAllocatorStrategy:AllocatorChanged", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "SingleAllocatorStrategy" });
});
