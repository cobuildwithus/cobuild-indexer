import { type Context, type Event, ponder } from "ponder:registry";
import { project } from "ponder:schema";
import { refreshProjectCashoutCoefficients } from "../../lib/cashout-coefficients";

ponder.on("JBMultiTerminal:SendPayouts", sendPayouts);

async function sendPayouts(params: {
  event: Event<"JBMultiTerminal:SendPayouts">;
  context: Context<"JBMultiTerminal:SendPayouts">;
}) {
  const { context, event } = params;
  const { args } = event;
  const { id: chainId } = context.chain;

  const { projectId: _projectId, rulesetId, amountPaidOut } = args;
  const projectId = Number(_projectId);

  await context.db
    .update(project, {
      chainId,
      projectId,
    })
    .set((p) => ({
      balance: p.balance - amountPaidOut,
      currentRulesetId: rulesetId,
    }));

  await refreshProjectCashoutCoefficients({
    db: context.db,
    chainId,
    projectId,
    snapshot: {
      timestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    },
  });
}
