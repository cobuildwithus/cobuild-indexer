import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleSuperTokenSwept(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });
}

ponder.on("GoalFlow:SuperTokenSwept", async ({ event, context }) => {
  await handleSuperTokenSwept({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:SuperTokenSwept", async ({ event, context }) => {
  await handleSuperTokenSwept({ event, context, contractName: "ChildFlow" });
});
