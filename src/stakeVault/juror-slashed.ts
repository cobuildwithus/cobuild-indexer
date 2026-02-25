import { ponder } from "ponder:registry";
import { sql } from "drizzle-orm";

import { juror } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { jurorId } from "../helpers/ids";

async function handleJurorSlashed(args: { event: any; context: any; contractName: string }) {
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
      slashedTotal: event.args.appliedWeight,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        slashedTotal: sql`${juror.slashedTotal} + ${event.args.appliedWeight}`,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalStakeVault:JurorSlashed", async ({ event, context }) => {
  await handleJurorSlashed({ event, context, contractName: "GoalStakeVault" });
});

ponder.on("BudgetStakeVault:JurorSlashed", async ({ event, context }) => {
  await handleJurorSlashed({ event, context, contractName: "BudgetStakeVault" });
});
