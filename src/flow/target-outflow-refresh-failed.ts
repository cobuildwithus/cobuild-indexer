import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleTargetOutflowRefreshFailed(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });
  // Intentionally no state mutation; this is telemetry for operators/indexers.
}

ponder.on("GoalFlow:TargetOutflowRefreshFailed", async ({ event, context }) => {
  await handleTargetOutflowRefreshFailed({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:TargetOutflowRefreshFailed", async ({ event, context }) => {
  await handleTargetOutflowRefreshFailed({ event, context, contractName: "ChildFlow" });
});
