import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleJurorSlasherSet(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });
}

ponder.on("GoalStakeVault:JurorSlasherSet", async ({ event, context }) => {
  await handleJurorSlasherSet({ event, context, contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:JurorSlasherSet", async ({ event, context }) => {
  await handleJurorSlasherSet({ event, context, contractName: "BudgetStakeVault" });
});
