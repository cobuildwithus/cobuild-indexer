import { ponder } from "ponder:registry";

import { juror } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { jurorId } from "../helpers/ids";

async function handleJurorExitRequested(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const vault = event.log.address;
  const jurorAddress = event.args.juror;

  const id = jurorId(vault, jurorAddress);
  await context.db
    .insert(juror)
    .values({
      id,
      vault,
      jurorAddress,
      optedIn: true,
      exitTime: event.args.availableAt,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        exitTime: event.args.availableAt,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalStakeVault:JurorExitRequested", async ({ event, context }) => {
  await handleJurorExitRequested({ event, context, contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:JurorExitRequested", async ({ event, context }) => {
  await handleJurorExitRequested({ event, context, contractName: "BudgetStakeVault" });
});
