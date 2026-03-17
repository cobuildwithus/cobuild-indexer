import { ponder, type Context, type Event } from "ponder:registry";
import { zeroAddress } from "viem";
import { ERC20ToProjectId, participant, project } from "ponder:schema";

type TransferEventName = "ERC20:Transfer" | "GoalToken:Transfer";

ponder.on("ERC20:Transfer", handleTransfer);
ponder.on("GoalToken:Transfer", handleTransfer);

async function handleTransfer(params: {
  event: Event<TransferEventName>;
  context: Context<TransferEventName>;
}) {
  const { event, context } = params;
  const { value } = event.args;
  const chainId = context.chain.id;

  const tokenContract = event.log.address.toLowerCase() as `0x${string}`;
  const from = event.args.from.toLowerCase() as `0x${string}`;
  const to = event.args.to.toLowerCase() as `0x${string}`;

  const projectMapping = await context.db.find(ERC20ToProjectId, {
    erc20: tokenContract,
    chainId,
  });

  if (!projectMapping) {
    throw new Error(`Missing project mapping for token ${tokenContract}`);
  }

  const projectId = projectMapping.projectId;

  const _project = await context.db.find(project, {
    projectId,
    chainId,
  });

  if (!_project) {
    throw new Error(`Missing project ${projectId}`);
  }

  // Decrease the amount from the sender
  if (from !== zeroAddress) {
    await context.db
      .update(participant, { chainId, address: from, projectId })
      .set((row) => ({
        balance: row.balance - value,
      }));
  }

  // Increase the amount for the receiver
  if (to !== zeroAddress) {
    await context.db
      .insert(participant)
      .values({
        createdAt: event.block.timestamp,
        address: to,
        chainId,
        projectId,
        balance: value,
        firstOwned: event.block.timestamp,
        isRevnet: _project.isRevnet,
        suckerGroupId: _project.suckerGroupId,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + value,
      }));
  }
}
