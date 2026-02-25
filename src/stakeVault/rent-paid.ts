import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleRentPaid(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });
}

ponder.on("GoalStakeVault:RentPaid", async ({ event, context }) => {
  await handleRentPaid({ event, context, contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:RentPaid", async ({ event, context }) => {
  await handleRentPaid({ event, context, contractName: "BudgetStakeVault" });
});
