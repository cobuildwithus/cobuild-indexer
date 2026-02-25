import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { juror } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { jurorId } from "../helpers/ids";

async function handleJurorExitFinalized(args: { event: any; context: any; contractName: string }) {
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
      optedIn: false,
      exitTime: null,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        optedIn: false,
        exitTime: null,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalStakeVault:JurorExitFinalized", async ({ event, context }) => {
  await handleJurorExitFinalized({ event, context, contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:JurorExitFinalized", async ({ event, context }) => {
  await handleJurorExitFinalized({ event, context, contractName: "BudgetStakeVault" });
});
