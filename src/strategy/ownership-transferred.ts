import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("SingleAllocatorStrategy:OwnershipTransferred", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "SingleAllocatorStrategy" });
});
