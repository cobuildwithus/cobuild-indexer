import {
  removalHandledStatus,
  terminalizationRetriedStatus,
  upsertBudgetStackStatus
} from "../src/tcr/budget-stack-status";
import { describe, expect, it } from "vitest";

function createDbRecorder() {
  const calls: Array<{ stage: string; value?: Record<string, unknown> }> = [];
  const db = {
    insert: () => ({
      values: (value: Record<string, unknown>) => {
        calls.push({ stage: "values", value });
        return {
          onConflictDoUpdate: async (update: Record<string, unknown>) => {
            calls.push({ stage: "onConflictDoUpdate", value: update });
          }
        };
      }
    })
  };
  return { db, calls };
}

describe("budget stack status helpers", () => {
  it("maps removal handled status deterministically", () => {
    expect(removalHandledStatus(true)).toBe("REMOVED_TERMINAL");
    expect(removalHandledStatus(false)).toBe("REMOVED");
  });

  it("maps terminalization retried status deterministically", () => {
    expect(terminalizationRetriedStatus(true)).toBe("TERMINALIZED");
    expect(terminalizationRetriedStatus(false)).toBe("TERMINALIZATION_RETRIED");
  });

  it("upserts status without requiring a pre-existing budget_stack row", async () => {
    const { db, calls } = createDbRecorder();
    await upsertBudgetStackStatus({
      db,
      table: "budget_stack",
      itemId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      status: "REMOVAL_QUEUED",
      blockNumber: 123n,
      blockTimestamp: 456n
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.stage).toBe("values");
    expect(calls[0]?.value?.status).toBe("REMOVAL_QUEUED");
    expect(calls[1]?.stage).toBe("onConflictDoUpdate");
    expect(calls[1]?.value?.status).toBe("REMOVAL_QUEUED");
  });
});
