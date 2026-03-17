import { type Context, type Event, ponder } from "ponder:registry";
import { project } from "ponder:schema";
import { refreshProjectCashoutCoefficients } from "../../lib/cashout-coefficients";

ponder.on("JBMultiTerminal:UseAllowance", useAllowance);

async function useAllowance(params: {
  event: Event<"JBMultiTerminal:UseAllowance">;
  context: Context<"JBMultiTerminal:UseAllowance">;
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
