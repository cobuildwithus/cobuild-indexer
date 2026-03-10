import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitResolverLifecycleNotification } from "./notification-fanout";

ponder.on("UMATreasurySuccessResolver:AssertionSettled", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "UMATreasurySuccessResolver" });

  await emitResolverLifecycleNotification({
    context,
    event,
    assertionId: event.args.assertionId,
    goalReason: "goal_success_assertion_settled",
    budgetReason: "budget_success_assertion_settled",
    sourceState: "settled",
    actorWalletAddress: event.args.settleCaller,
  });
});
