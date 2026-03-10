import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitResolverLifecycleNotification } from "./notification-fanout";

ponder.on("UMATreasurySuccessResolver:TreasurySuccessResolved", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "UMATreasurySuccessResolver" });

  await emitResolverLifecycleNotification({
    context,
    event,
    treasuryAddress: event.args.treasury,
    goalReason: "goal_success_assertion_resolved",
    budgetReason: "budget_success_assertion_resolved",
    sourceState: "resolved",
  });
});
