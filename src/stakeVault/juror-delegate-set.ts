import { ponder } from "ponder:registry";

import { juror } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { jurorId } from "../helpers/ids";

async function handleJurorDelegateSet(args: { event: any; context: any; contractName: string }) {
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
      delegate: event.args.delegate,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        delegate: event.args.delegate,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalStakeVault:JurorDelegateSet", async ({ event, context }) => {
  await handleJurorDelegateSet({ event, context, contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:JurorDelegateSet", async ({ event, context }) => {
  await handleJurorDelegateSet({ event, context, contractName: "BudgetStakeVault" });
});
