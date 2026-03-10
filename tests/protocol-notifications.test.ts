import { describe, expect, it, vi } from "vitest";
import { parseProtocolNotificationPayload } from "@cobuild/wire";
import type { Hex } from "viem";
vi.mock("ponder:schema", () => ({
  budgetUnderwriterAudience: {},
  budgetUnderwriterCurrent: {},
  goalStakeholderAudience: {},
  goalTreasury: {},
  goalUnderwriterAudience: {},
  goalUnderwriterCurrent: {},
  juror: {},
  protocolNotificationOutbox: {},
  protocolNotificationSchedule: {},
  stakePosition: {},
  stakeVault: {},
  stakeVaultJurorAudience: {},
}));

const {
  buildProtocolNotificationPayload,
  collectRecipientRoles,
  getBigIntArg,
  getHexArg,
  protocolNotificationOutboxId,
  reminderDeliverAt,
  toRequestType,
} = await import("../src/helpers/protocolNotifications");

describe("protocol notification helpers", () => {
  it("builds deterministic lowercased outbox ids", () => {
    expect(
      protocolNotificationOutboxId({
        txHash: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
        logIndex: 9,
        sourceType: "budget_request",
        sourceId: "Budget:1",
        recipientWalletAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        action: "upsert",
      })
    ).toBe(
      "budget_request:Budget:1:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:upsert:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb:9"
    );
  });

  it("maps request types from numeric protocol values", () => {
    expect(toRequestType(2n)).toBe("registration");
    expect(toRequestType(3)).toBe("clearing");
    expect(toRequestType(99)).toBe("unknown");
  });

  it("extracts typed event args defensively", () => {
    const args = {
      requestType: "2",
      itemID: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    };

    expect(getBigIntArg(args, "requestType")).toBe(2n);
    expect(getHexArg(args, "itemID")).toBe(
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    );
    expect(getHexArg(args, "missing")).toBeNull();
  });

  it("dedupes recipients and keeps the highest-priority role per wallet", () => {
    const recipientRoles = collectRecipientRoles({
      goalOwner: "0x0000000000000000000000000000000000000002",
      stakeholderAccounts: [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      ],
      requestActors: [
        {
          address: "0x0000000000000000000000000000000000000002",
          role: "challenger",
        },
        {
          address: "0x0000000000000000000000000000000000000003",
          role: "proposer",
        },
      ],
    });

    expect(recipientRoles).toEqual([
      {
        recipientWalletAddress: "0x0000000000000000000000000000000000000001",
        role: "goal_stakeholder",
      },
      {
        recipientWalletAddress: "0x0000000000000000000000000000000000000002",
        role: "challenger",
      },
      {
        recipientWalletAddress: "0x0000000000000000000000000000000000000003",
        role: "proposer",
      },
    ]);
  });

  it("prefers juror and request-actor roles over underwriter and owner roles", () => {
    const recipientRoles = collectRecipientRoles({
      goalOwner: "0x0000000000000000000000000000000000000001",
      budgetController: "0x0000000000000000000000000000000000000001",
      stakeholderAccounts: ["0x0000000000000000000000000000000000000001"],
      goalUnderwriterAccounts: ["0x0000000000000000000000000000000000000001"],
      budgetUnderwriterAccounts: ["0x0000000000000000000000000000000000000001"],
      jurorAccounts: ["0x0000000000000000000000000000000000000001"],
      requestActors: [
        {
          address: "0x0000000000000000000000000000000000000002",
          role: "proposer",
        },
      ],
    });

    expect(recipientRoles).toEqual([
      {
        recipientWalletAddress: "0x0000000000000000000000000000000000000001",
        role: "juror",
      },
      {
        recipientWalletAddress: "0x0000000000000000000000000000000000000002",
        role: "proposer",
      },
    ]);
  });

  it("builds structured payloads for request and goal lifecycle reasons", () => {
    const goalRow = {
      id: "0x00000000000000000000000000000000000000aa" as Hex,
      owner: "0x00000000000000000000000000000000000000bb" as Hex,
      stakeVault: "0x00000000000000000000000000000000000000ee" as Hex,
      canonicalRouteSlug: "alpha",
    };

    expect(
      buildProtocolNotificationPayload({
        role: "requester",
        goalRow,
        reason: "budget_accepted",
        itemId:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
        requestIndex: 4n,
        budgetTreasury: "0x00000000000000000000000000000000000000cc",
        actorWalletAddress: "0x00000000000000000000000000000000000000dd",
      })
    ).toEqual({
      role: "requester",
      resource: {
        kind: "budget_request",
        goalTreasury: "0x00000000000000000000000000000000000000aa",
        budgetTreasury: "0x00000000000000000000000000000000000000cc",
        itemId:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
        requestIndex: "4",
        arbitrator: null,
        disputeId: null,
      },
      actor: {
        walletAddress: "0x00000000000000000000000000000000000000dd",
      },
      labels: {
        goalName: "alpha",
      },
      schedule: null,
      amounts: null,
    });

    expect(
      buildProtocolNotificationPayload({
        role: "goal_owner",
        goalRow,
        reason: "goal_succeeded",
      })
    ).toEqual({
      role: "goal_owner",
      resource: {
        kind: "goal",
        goalTreasury: "0x00000000000000000000000000000000000000aa",
        budgetTreasury: null,
        itemId: null,
        requestIndex: null,
        arbitrator: null,
        disputeId: null,
      },
      actor: null,
      labels: {
        goalName: "alpha",
      },
      schedule: null,
      amounts: null,
    });

    expect(
      buildProtocolNotificationPayload({
        role: "budget_controller",
        goalRow,
        reason: "budget_success_assertion_registered",
        budgetTreasury: "0x00000000000000000000000000000000000000cc",
      })
    ).toEqual({
      role: "budget_controller",
      resource: {
        kind: "budget",
        goalTreasury: "0x00000000000000000000000000000000000000aa",
        budgetTreasury: "0x00000000000000000000000000000000000000cc",
        itemId: null,
        requestIndex: null,
        arbitrator: null,
        disputeId: null,
      },
      actor: null,
      labels: {
        goalName: "alpha",
      },
      schedule: null,
      amounts: null,
    });

    expect(
      buildProtocolNotificationPayload({
        role: "budget_underwriter",
        goalRow,
        reason: "premium_claimable",
        budgetTreasury: "0x00000000000000000000000000000000000000cc",
        amounts: {
          claimable: 42n,
          claimedAmount: 7n,
        },
      })
    ).toEqual({
      role: "budget_underwriter",
      resource: {
        kind: "budget",
        goalTreasury: "0x00000000000000000000000000000000000000aa",
        budgetTreasury: "0x00000000000000000000000000000000000000cc",
        itemId: null,
        requestIndex: null,
        arbitrator: null,
        disputeId: null,
      },
      actor: null,
      labels: {
        goalName: "alpha",
      },
      schedule: null,
      amounts: {
        allocatedStake: null,
        claimable: "42",
        claimedAmount: "7",
        snapshotWeight: null,
        snapshotVotes: null,
        slashWeight: null,
      },
    });
  });

  it("builds expanded reminder and juror reward payload fields", () => {
    const goalRow = {
      id: "0x00000000000000000000000000000000000000aa" as Hex,
      owner: "0x00000000000000000000000000000000000000bb" as Hex,
      stakeVault: "0x00000000000000000000000000000000000000ee" as Hex,
      canonicalRouteSlug: "alpha",
    };

    expect(
      buildProtocolNotificationPayload({
        role: "goal_owner",
        goalRow,
        reason: "budget_proposal_challenge_window_ending_soon",
        itemId:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
        requestIndex: 4n,
        budgetTreasury: "0x00000000000000000000000000000000000000cc",
        schedule: {
          deliverAt: 35n,
          challengeWindowEndAt: 50n,
        },
        labels: {
          reminderContextLabel: "budget proposal",
        },
      })
    ).toEqual({
      role: "goal_owner",
      resource: {
        kind: "budget_request",
        goalTreasury: "0x00000000000000000000000000000000000000aa",
        budgetTreasury: "0x00000000000000000000000000000000000000cc",
        itemId:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
        requestIndex: "4",
        arbitrator: null,
        disputeId: null,
      },
      actor: null,
      labels: {
        goalName: "alpha",
        reminderContextLabel: "budget proposal",
      },
      schedule: {
        deliverAt: "35",
        votingStartAt: null,
        votingEndAt: null,
        revealEndAt: null,
        challengeWindowEndAt: "50",
      },
      amounts: null,
    });

    expect(
      buildProtocolNotificationPayload({
        role: "goal_owner",
        goalRow,
        reason: "goal_success_assertion_registered",
        schedule: {
          reassertGraceDeadline: 90n,
        },
      })
    ).toEqual({
      role: "goal_owner",
      resource: {
        kind: "goal",
        goalTreasury: "0x00000000000000000000000000000000000000aa",
        budgetTreasury: null,
        itemId: null,
        requestIndex: null,
        arbitrator: null,
        disputeId: null,
      },
      actor: null,
      labels: {
        goalName: "alpha",
      },
      schedule: {
        deliverAt: null,
        votingStartAt: null,
        votingEndAt: null,
        revealEndAt: null,
        reassertGraceDeadline: "90",
      },
      amounts: null,
    });

    expect(
      buildProtocolNotificationPayload({
        role: "juror",
        goalRow,
        reason: "juror_reward_claimable",
        arbitrator: "0x00000000000000000000000000000000000000dd",
        disputeId: 7n,
        amounts: {
          claimable: 42n,
          claimableReward: 10n,
          claimableGoalSlashReward: 20n,
          claimableCobuildSlashReward: 12n,
        },
      })
    ).toEqual({
      role: "juror",
      resource: {
        kind: "juror_dispute",
        goalTreasury: "0x00000000000000000000000000000000000000aa",
        budgetTreasury: null,
        itemId: null,
        requestIndex: null,
        arbitrator: "0x00000000000000000000000000000000000000dd",
        disputeId: "7",
      },
      actor: null,
      labels: {
        goalName: "alpha",
      },
      schedule: null,
      amounts: {
        allocatedStake: null,
        claimable: "42",
        claimedAmount: null,
        snapshotWeight: null,
        snapshotVotes: null,
        slashWeight: null,
        claimableReward: "10",
        claimableGoalSlashReward: "20",
        claimableCobuildSlashReward: "12",
      },
    });

    const rewardPayload = buildProtocolNotificationPayload({
      role: "juror",
      goalRow,
      reason: "juror_reward_claimable",
      arbitrator: "0x00000000000000000000000000000000000000dd",
      disputeId: 7n,
      reward: {
        bucket: "mixed",
        bucketLabel: "mixed",
      },
    });

    expect(rewardPayload).toEqual({
      role: "juror",
      resource: {
        kind: "juror_dispute",
        goalTreasury: "0x00000000000000000000000000000000000000aa",
        budgetTreasury: null,
        itemId: null,
        requestIndex: null,
        arbitrator: "0x00000000000000000000000000000000000000dd",
        disputeId: "7",
      },
      actor: null,
      labels: {
        goalName: "alpha",
      },
      schedule: null,
      amounts: null,
      reward: {
        bucket: "mixed",
        bucketLabel: "mixed",
      },
    });

    expect(
      buildProtocolNotificationPayload({
        role: "juror",
        goalRow,
        reason: "juror_vote_deadline_soon",
        arbitrator: "0x00000000000000000000000000000000000000dd",
        disputeId: 7n,
        schedule: {
          deliverAt: 35n,
          votingStartAt: 10n,
          votingEndAt: 50n,
          revealEndAt: 75n,
        },
      })
    ).toEqual({
      role: "juror",
      resource: {
        kind: "juror_dispute",
        goalTreasury: "0x00000000000000000000000000000000000000aa",
        budgetTreasury: null,
        itemId: null,
        requestIndex: null,
        arbitrator: "0x00000000000000000000000000000000000000dd",
        disputeId: "7",
      },
      actor: null,
      labels: {
        goalName: "alpha",
      },
      schedule: {
        deliverAt: "35",
        votingStartAt: "10",
        votingEndAt: "50",
        revealEndAt: "75",
      },
      amounts: null,
    });
  });

  it("round-trips canonical indexer protocol payloads through wire parsing", () => {
    const payload = buildProtocolNotificationPayload({
      role: "goal_owner",
      goalRow: {
        id: "0x00000000000000000000000000000000000000aa" as Hex,
        owner: "0x00000000000000000000000000000000000000bb" as Hex,
        stakeVault: "0x00000000000000000000000000000000000000ee" as Hex,
        canonicalRouteSlug: "alpha",
      },
      reason: "budget_proposal_challenge_window_ending_soon",
      budgetTreasury: "0x00000000000000000000000000000000000000cc",
      itemId:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      requestIndex: 4n,
      schedule: {
        deliverAt: 35n,
        challengeWindowEndAt: 50n,
        reassertGraceDeadline: 90n,
      },
      labels: {
        reminderContextLabel: " budget proposal ",
      },
    });

    expect(parseProtocolNotificationPayload(payload)).toMatchObject({
      role: "goal_owner",
      resource: {
        kind: "budget_request",
        goalTreasury: "0x00000000000000000000000000000000000000aa",
        budgetTreasury: "0x00000000000000000000000000000000000000cc",
        itemId:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
        requestIndex: "4",
        arbitrator: null,
        disputeId: null,
      },
      actor: null,
      labels: {
        goalName: "alpha",
        budgetName: null,
        mechanismName: null,
        reminderContextLabel: "budget proposal",
      },
      schedule: {
        deliverAt: "35",
        votingStartAt: null,
        votingEndAt: null,
        revealEndAt: null,
        challengeWindowEndAt: "50",
        reassertGraceDeadline: "90",
      },
      amounts: null,
    });
  });

  it("clamps reminder delivery inside short windows", () => {
    expect(
      reminderDeliverAt({
        windowStartAt: 20n,
        windowEndAt: 50n,
      })
    ).toBe(35n);
    expect(
      reminderDeliverAt({
        windowStartAt: 1_000n,
        windowEndAt: 2_000n,
      })
    ).toBe(1_500n);
  });
});
