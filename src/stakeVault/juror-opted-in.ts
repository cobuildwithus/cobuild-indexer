import { ponder } from "ponder:registry";

import { juror } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { jurorId } from "../helpers/ids";

async function handleJurorOptedIn(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const vault = event.log.address;
  const jurorAddress = event.args.juror;

  await context.db
    .insert(juror)
    .values({
      id: jurorId(vault, jurorAddress),
      vault,
      jurorAddress,
      optedIn: true,
      exitTime: null,
      delegate: event.args.delegate,
      slasher: null,
      slashedTotal: 0n,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        optedIn: true,
        exitTime: null,
        delegate: event.args.delegate,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalStakeVault:JurorOptedIn", async ({ event, context }) => {
  await handleJurorOptedIn({ event, context, contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:JurorOptedIn", async ({ event, context }) => {
  await handleJurorOptedIn({ event, context, contractName: "BudgetStakeVault" });
});
