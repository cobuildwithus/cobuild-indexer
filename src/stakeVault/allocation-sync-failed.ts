import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleAllocationSyncFailed(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });
}

ponder.on("GoalStakeVault:AllocationSyncFailed", async ({ event, context }) => {
  await handleAllocationSyncFailed({ event, context, contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:AllocationSyncFailed", async ({ event, context }) => {
  await handleAllocationSyncFailed({ event, context, contractName: "BudgetStakeVault" });
});
