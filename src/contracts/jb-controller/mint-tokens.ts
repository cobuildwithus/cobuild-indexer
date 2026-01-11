import { type Context, type Event, ponder } from "ponder:registry";
import { payEvent, payEventByTxBeneficiary, project } from "ponder:schema";
import { refreshProjectCashoutCoefficients } from "../../lib/cashout-coefficients";

ponder.on("JBController:MintTokens", mintTokens);

async function mintTokens(params: {
  event: Event<"JBController:MintTokens">;
  context: Context<"JBController:MintTokens">;
}) {
  const { event, context } = params;
  const { args } = event;
  const {
    projectId: _projectId,
    beneficiary,
    beneficiaryTokenCount,
    tokenCount,
  } = args;
  const projectId = Number(_projectId);
  const chainId = context.chain.id;

  const newReservedTokens = tokenCount - beneficiaryTokenCount;

  await context.db.update(project, { chainId, projectId }).set((p) => ({
    pendingReservedTokens: p.pendingReservedTokens + newReservedTokens,
  }));

  if (beneficiaryTokenCount > 0n) {
    const mapping = await context.db.find(payEventByTxBeneficiary, {
      chainId,
      txHash: event.transaction.hash,
      beneficiary,
    });

    if (mapping && mapping.payLogIndex < event.log.logIndex) {
      const mappedPayEvent = await context.db.find(payEvent, {
        id: mapping.payEventId,
      });

      if (mappedPayEvent && mappedPayEvent.newlyIssuedTokenCount === 0n) {
        await context.db
          .update(payEvent, { id: mapping.payEventId })
          .set({ newlyIssuedTokenCount: beneficiaryTokenCount });
      }
    }
  }

  await refreshProjectCashoutCoefficients({
    db: context.db,
    chainId,
    projectId,
    snapshot: {
      timestamp: Number(event.block.timestamp),
      txHash: event.transaction.hash,
    },
  });
}
