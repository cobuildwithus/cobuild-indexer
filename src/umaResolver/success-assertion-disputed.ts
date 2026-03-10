import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitResolverLifecycleNotification } from "./notification-fanout";

ponder.on("UMATreasurySuccessResolver:AssertionDisputed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "UMATreasurySuccessResolver" });

  await emitResolverLifecycleNotification({
    context,
    event,
    assertionId: event.args.assertionId,
    goalReason: "goal_success_assertion_disputed",
    budgetReason: "budget_success_assertion_disputed",
    sourceState: "disputed",
    actorWalletAddress: event.args.disputer,
  });
});
