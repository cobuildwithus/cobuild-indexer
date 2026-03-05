export type BudgetStackStatus =
  | "ACTIVATION_QUEUED"
  | "REMOVAL_QUEUED"
  | "REMOVED"
  | "REMOVED_TERMINAL"
  | "TERMINALIZATION_RETRIED"
  | "TERMINALIZED";

export function removalHandledStatus(terminallyResolved: boolean): BudgetStackStatus {
  return terminallyResolved ? "REMOVED_TERMINAL" : "REMOVED";
}

export function terminalizationRetriedStatus(terminallyResolved: boolean): BudgetStackStatus {
  return terminallyResolved ? "TERMINALIZED" : "TERMINALIZATION_RETRIED";
}

export async function upsertBudgetStackStatus(args: {
  db: any;
  table: unknown;
  itemId: `0x${string}`;
  status: BudgetStackStatus;
  blockNumber: bigint;
  blockTimestamp: bigint;
}): Promise<void> {
  const { db, table, itemId, status, blockNumber, blockTimestamp } = args;
  await db
    .insert(table)
    .values({
      id: itemId,
      status,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoUpdate({
      status,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    });
}
