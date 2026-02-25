import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetStakeLedger:StakeLedgerFinalized", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetStakeLedger" });
});
