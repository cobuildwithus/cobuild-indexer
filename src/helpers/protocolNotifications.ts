import type { Context, Event } from "ponder:registry";
import type { Hex } from "viem";

import {
  budgetTreasury,
  budgetUnderwriterAudience,
  budgetUnderwriterCurrent,
  goalContextByBudgetTreasury,
  goalContextByBudgetStakeLedger,
  goalStakeholderAudience,
  goalTreasury,
  goalUnderwriterAudience,
  goalUnderwriterCurrent,
  juror,
  protocolNotificationOutbox,
  protocolNotificationSchedule,
  stakePosition,
  stakeVault,
  stakeVaultJurorAudience,
  tcrItem,
  tcrRequest,
} from "ponder:schema";

import {
  budgetUnderwriterCurrentId,
  goalUnderwriterCurrentId,
  jurorId,
  stakePositionId,
} from "./ids";
import { toJson } from "./serialize";

export type RecipientRole =
  | "requester"
  | "challenger"
  | "proposer"
  | "budget_controller"
  | "goal_owner"
  | "goal_stakeholder"
  | "goal_underwriter"
  | "budget_underwriter"
  | "juror";

type NotificationHelperEventName =
  | "GoalStakeVault:GoalStaked"
  | "GoalStakeVault:GoalWithdrawn"
  | "GoalStakeVault:CobuildStaked"
  | "GoalStakeVault:CobuildWithdrawn"
  | "GoalTreasury:StateTransition"
  | "BudgetTCRProtocolEvents:RequestSubmitted"
  | "BudgetTCRProtocolEvents:Dispute"
  | "BudgetTCR:BudgetStackActivationQueued"
  | "BudgetTCR:BudgetStackRemovalQueued"
  | "BudgetStakeLedger:BudgetRegistered"
  | "BudgetStakeLedger:BudgetRemoved";

type NotificationContext = Pick<Context<NotificationHelperEventName>, "db" | "chain">;
type NotificationEvent = {
  transaction: Pick<Event<NotificationHelperEventName>["transaction"], "hash">;
  block: Pick<Event<NotificationHelperEventName>["block"], "number" | "timestamp">;
  log: Pick<Event<NotificationHelperEventName>["log"], "address" | "logIndex">;
};

type GoalRow = {
  id: Hex;
  owner: Hex | null;
  stakeVault: Hex | null;
  canonicalRouteSlug: string | null;
};

function toGoalRow(
  row:
    | {
        id: Hex;
        owner: Hex | null;
        stakeVault: Hex | null;
        canonicalRouteSlug: string | null;
      }
    | null
    | undefined
): GoalRow | null {
  if (!row) return null;
  return {
    id: normalizeHex(row.id),
    owner: normalizeHexOrNull(row.owner),
    stakeVault: normalizeHexOrNull(row.stakeVault),
    canonicalRouteSlug: row.canonicalRouteSlug ?? null,
  };
}

const ROLE_PRIORITY: Record<RecipientRole, number> = {
  requester: 8,
  challenger: 8,
  proposer: 7,
  juror: 6,
  budget_controller: 5,
  goal_owner: 4,
  budget_underwriter: 3,
  goal_underwriter: 2,
  goal_stakeholder: 1,
};

function normalizeHex(value: Hex): Hex {
  return value.toLowerCase() as Hex;
}

function normalizeHexOrNull(value: Hex | null | undefined): Hex | null {
  return value ? normalizeHex(value) : null;
}

function uniqueSortedHex(values: readonly Hex[]): Hex[] {
  return Array.from(new Set(values.map((value) => normalizeHex(value)))).sort() as Hex[];
}

function toStringOrNull(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

function resourceKindForReason(reason: string): string {
  if (reason.endsWith("challenge_window_ending_soon")) {
    return reason.includes("mechanism") ? "mechanism_request" : "budget_request";
  }

  if (
    reason === "goal_active" ||
    reason === "goal_succeeded" ||
    reason === "goal_expired" ||
    reason.startsWith("goal_success_assertion_") ||
    reason === "underwriter_withdrawal_prep_required" ||
    reason === "underwriter_withdrawal_prep_complete"
  ) {
    return "goal";
  }

  if (
    reason === "budget_activated" ||
    reason === "budget_removed" ||
    reason === "budget_active" ||
    reason === "budget_succeeded" ||
    reason === "budget_failed" ||
    reason === "budget_expired" ||
    reason.startsWith("budget_success_assertion_") ||
    reason === "budget_success_resolution_disabled" ||
    reason === "underwriter_slashed" ||
    reason === "premium_claimable" ||
    reason === "premium_claimed"
  ) {
    return "budget";
  }

  if (
    reason === "mechanism_proposed" ||
    reason === "mechanism_challenged" ||
    reason === "mechanism_accepted" ||
    reason === "mechanism_activated" ||
    reason === "mechanism_removal_requested" ||
    reason === "mechanism_removal_accepted" ||
    reason === "mechanism_removed"
  ) {
    return "mechanism_request";
  }

  if (
    reason === "juror_dispute_created" ||
    reason === "juror_voting_open" ||
    reason === "juror_reveal_open" ||
    reason === "juror_vote_deadline_soon" ||
    reason === "juror_reveal_deadline_soon" ||
    reason === "juror_ruling_final" ||
    reason === "juror_reward_claimable" ||
    reason === "juror_reward_claimed" ||
    reason === "juror_slashable" ||
    reason === "juror_slashed"
  ) {
    return "juror_dispute";
  }

  return "budget_request";
}

export type NotificationAction = "upsert" | "invalidate";
export type NotificationClass = "edge" | "open_close" | "cycle";

const DEFAULT_REMINDER_LEAD_TIME_SECONDS = 24n * 60n * 60n;

export function protocolNotificationOutboxId(args: {
  txHash: Hex;
  logIndex: number;
  sourceType: string;
  sourceId: string;
  recipientWalletAddress: Hex;
  action: NotificationAction;
}): string {
  return [
    args.sourceType,
    args.sourceId,
    normalizeHex(args.recipientWalletAddress),
    args.action,
    normalizeHex(args.txHash),
    args.logIndex.toString(),
  ].join(":");
}

export function protocolNotificationScheduleId(args: {
  sourceType: string;
  sourceId: string;
  recipientWalletAddress: Hex;
}): string {
  return `${args.sourceType}:${args.sourceId}:${normalizeHex(args.recipientWalletAddress)}`;
}

export function reminderDeliverAt(args: {
  windowStartAt: bigint | null | undefined;
  windowEndAt: bigint | null | undefined;
  leadTimeSeconds?: bigint | null | undefined;
}): bigint | null {
  const windowEndAt = args.windowEndAt ?? null;
  if (windowEndAt === null || windowEndAt <= 0n) return null;

  const leadTime =
    args.leadTimeSeconds && args.leadTimeSeconds > 0n
      ? args.leadTimeSeconds
      : DEFAULT_REMINDER_LEAD_TIME_SECONDS;
  const windowStartAt = args.windowStartAt ?? null;

  if (windowStartAt === null || windowStartAt >= windowEndAt) {
    return windowEndAt > leadTime ? windowEndAt - leadTime : windowEndAt;
  }

  const duration = windowEndAt - windowStartAt;
  const clampedLead =
    duration <= 1n ? 1n : duration / 2n < leadTime ? duration / 2n : leadTime;
  const deliverAt = windowEndAt - clampedLead;
  return deliverAt > windowStartAt ? deliverAt : windowStartAt;
}

export function toRequestType(value: unknown): "registration" | "clearing" | "unknown" {
  if (typeof value === "bigint") {
    if (value === 2n) return "registration";
    if (value === 3n) return "clearing";
    return "unknown";
  }
  if (typeof value === "number") {
    if (value === 2) return "registration";
    if (value === 3) return "clearing";
    return "unknown";
  }
  return "unknown";
}

export function challengeWindowReminderReason(args: {
  tcrKind: "budget" | "mechanism";
  requestType: "registration" | "clearing";
}): string {
  const prefix = args.tcrKind === "mechanism" ? "mechanism" : "budget";
  return args.requestType === "clearing"
    ? `${prefix}_removal_challenge_window_ending_soon`
    : `${prefix}_proposal_challenge_window_ending_soon`;
}

export function challengeWindowReminderLabel(args: {
  tcrKind: "budget" | "mechanism";
  requestType: "registration" | "clearing";
}): string {
  const prefix = args.tcrKind === "mechanism" ? "mechanism" : "budget";
  return args.requestType === "clearing" ? `${prefix} removal` : `${prefix} proposal`;
}

export function getHexArg(args: Record<string, unknown>, ...names: string[]): Hex | null {
  for (const name of names) {
    const value = args[name];
    if (typeof value === "string" && value.startsWith("0x")) {
      return normalizeHex(value as Hex);
    }
  }
  return null;
}

export function getBigIntArg(args: Record<string, unknown>, ...names: string[]): bigint | null {
  for (const name of names) {
    const value = args[name];
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isInteger(value)) return BigInt(value);
    if (typeof value === "string" && value.trim() !== "") {
      try {
        return BigInt(value);
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function syncGoalStakeholderAudience(args: {
  context: NotificationContext;
  stakeVaultAddress: Hex;
  account: Hex;
  blockNumber: bigint;
  blockTimestamp: bigint;
}): Promise<void> {
  const { context, stakeVaultAddress, account, blockNumber, blockTimestamp } = args;
  const normalizedVault = normalizeHex(stakeVaultAddress);
  const normalizedAccount = normalizeHex(account);
  const vaultRow = await context.db.find(stakeVault, { id: normalizedVault });
  const goalTreasuryId = normalizeHexOrNull((vaultRow?.treasury ?? null) as Hex | null);
  if (!goalTreasuryId) return;

  const [goalPosition, cobuildPosition] = await Promise.all([
    context.db.find(stakePosition, {
      id: stakePositionId(normalizedVault, normalizedAccount, "goal"),
    }),
    context.db.find(stakePosition, {
      id: stakePositionId(normalizedVault, normalizedAccount, "cobuild"),
    }),
  ]);

  const goalNet = BigInt(goalPosition?.staked ?? 0n) - BigInt(goalPosition?.withdrawn ?? 0n);
  const cobuildNet =
    BigInt(cobuildPosition?.staked ?? 0n) - BigInt(cobuildPosition?.withdrawn ?? 0n);
  const isActive = goalNet > 0n || cobuildNet > 0n;

  const existing = await context.db.find(goalStakeholderAudience, { id: goalTreasuryId });
  const accounts = Array.isArray(existing?.accounts)
    ? uniqueSortedHex(existing.accounts as Hex[])
    : [];
  const nextAccounts = isActive
    ? uniqueSortedHex([...accounts, normalizedAccount])
    : accounts.filter((value) => value !== normalizedAccount);

  if (!existing) {
    await context.db
      .insert(goalStakeholderAudience)
      .values({
        id: goalTreasuryId,
        stakeVault: normalizedVault,
        accounts: nextAccounts,
        updatedAtBlock: blockNumber,
        updatedAtTimestamp: blockTimestamp,
      })
      .onConflictDoNothing();
    return;
  }

  await context.db.update(goalStakeholderAudience, { id: goalTreasuryId }).set({
    stakeVault: normalizedVault,
    accounts: nextAccounts,
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  });
}

export async function syncBudgetUnderwriterAudience(args: {
  context: NotificationContext;
  goalTreasuryAddress: Hex;
  stakeVaultAddress: Hex | null | undefined;
  budgetTreasuryAddress: Hex;
  recipientId: Hex | null | undefined;
  account: Hex;
  allocatedStake: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint;
}): Promise<void> {
  const {
    context,
    goalTreasuryAddress,
    stakeVaultAddress,
    budgetTreasuryAddress,
    recipientId,
    account,
    allocatedStake,
    blockNumber,
    blockTimestamp,
  } = args;
  const normalizedGoalTreasury = normalizeHex(goalTreasuryAddress);
  const normalizedStakeVault = normalizeHexOrNull(stakeVaultAddress);
  const normalizedBudgetTreasury = normalizeHex(budgetTreasuryAddress);
  const normalizedAccount = normalizeHex(account);
  const normalizedRecipientId = normalizeHexOrNull(recipientId);
  const currentId = budgetUnderwriterCurrentId(normalizedBudgetTreasury, normalizedAccount);

  const existingCurrent = await context.db.find(budgetUnderwriterCurrent, { id: currentId });
  const previousAllocatedStake = BigInt(existingCurrent?.allocatedStake ?? 0n);
  const nextAllocatedStake = allocatedStake > 0n ? allocatedStake : 0n;

  await context.db
    .insert(budgetUnderwriterCurrent)
    .values({
      id: currentId,
      goalTreasury: normalizedGoalTreasury,
      stakeVault: normalizedStakeVault,
      budgetTreasury: normalizedBudgetTreasury,
      recipientId: normalizedRecipientId,
      account: normalizedAccount,
      allocatedStake: nextAllocatedStake,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: normalizedGoalTreasury,
      stakeVault: normalizedStakeVault,
      budgetTreasury: normalizedBudgetTreasury,
      recipientId: normalizedRecipientId,
      account: normalizedAccount,
      allocatedStake: nextAllocatedStake,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    });

  const existingBudgetAudience = await context.db.find(budgetUnderwriterAudience, {
    id: normalizedBudgetTreasury,
  });
  const budgetAccounts = Array.isArray(existingBudgetAudience?.accounts)
    ? uniqueSortedHex(existingBudgetAudience.accounts as Hex[])
    : [];
  const nextBudgetAccounts =
    nextAllocatedStake > 0n
      ? uniqueSortedHex([...budgetAccounts, normalizedAccount])
      : budgetAccounts.filter((value) => value !== normalizedAccount);

  if (!existingBudgetAudience) {
    await context.db
      .insert(budgetUnderwriterAudience)
      .values({
        id: normalizedBudgetTreasury,
        goalTreasury: normalizedGoalTreasury,
        stakeVault: normalizedStakeVault,
        accounts: nextBudgetAccounts,
        updatedAtBlock: blockNumber,
        updatedAtTimestamp: blockTimestamp,
      })
      .onConflictDoNothing();
  } else {
    await context.db.update(budgetUnderwriterAudience, { id: normalizedBudgetTreasury }).set({
      goalTreasury: normalizedGoalTreasury,
      stakeVault: normalizedStakeVault,
      accounts: nextBudgetAccounts,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    });
  }

  const goalCurrentId = goalUnderwriterCurrentId(normalizedGoalTreasury, normalizedAccount);
  const existingGoalCurrent = await context.db.find(goalUnderwriterCurrent, { id: goalCurrentId });
  const currentGoalAllocatedStake = BigInt(existingGoalCurrent?.allocatedStake ?? 0n);
  const nextGoalAllocatedStake = currentGoalAllocatedStake - previousAllocatedStake + nextAllocatedStake;
  const normalizedGoalAllocatedStake = nextGoalAllocatedStake > 0n ? nextGoalAllocatedStake : 0n;

  await context.db
    .insert(goalUnderwriterCurrent)
    .values({
      id: goalCurrentId,
      goalTreasury: normalizedGoalTreasury,
      stakeVault: normalizedStakeVault,
      account: normalizedAccount,
      allocatedStake: normalizedGoalAllocatedStake,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoUpdate({
      stakeVault: normalizedStakeVault,
      account: normalizedAccount,
      allocatedStake: normalizedGoalAllocatedStake,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    });

  const existingGoalAudience = await context.db.find(goalUnderwriterAudience, {
    id: normalizedGoalTreasury,
  });
  const goalAccounts = Array.isArray(existingGoalAudience?.accounts)
    ? uniqueSortedHex(existingGoalAudience.accounts as Hex[])
    : [];
  const nextGoalAccounts =
    normalizedGoalAllocatedStake > 0n
      ? uniqueSortedHex([...goalAccounts, normalizedAccount])
      : goalAccounts.filter((value) => value !== normalizedAccount);

  if (!existingGoalAudience) {
    await context.db
      .insert(goalUnderwriterAudience)
      .values({
        id: normalizedGoalTreasury,
        stakeVault: normalizedStakeVault,
        accounts: nextGoalAccounts,
        updatedAtBlock: blockNumber,
        updatedAtTimestamp: blockTimestamp,
      })
      .onConflictDoNothing();
    return;
  }

  await context.db.update(goalUnderwriterAudience, { id: normalizedGoalTreasury }).set({
    stakeVault: normalizedStakeVault,
    accounts: nextGoalAccounts,
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  });
}

export async function syncStakeVaultJurorAudience(args: {
  context: NotificationContext;
  stakeVaultAddress: Hex;
  jurorAddress: Hex;
  blockNumber: bigint;
  blockTimestamp: bigint;
}): Promise<void> {
  const { context, stakeVaultAddress, jurorAddress, blockNumber, blockTimestamp } = args;
  const normalizedVault = normalizeHex(stakeVaultAddress);
  const normalizedJuror = normalizeHex(jurorAddress);
  const vaultRow = await context.db.find(stakeVault, { id: normalizedVault });
  const goalTreasuryId = normalizeHexOrNull((vaultRow?.treasury ?? null) as Hex | null);
  const jurorRow = await context.db.find(juror, {
    id: jurorId(normalizedVault, normalizedJuror),
  });

  const currentJurorWeight = BigInt(jurorRow?.currentJurorWeight ?? 0n);
  const isActive = Boolean(jurorRow?.optedIn) && currentJurorWeight > 0n;

  const existing = await context.db.find(stakeVaultJurorAudience, { id: normalizedVault });
  const accounts = Array.isArray(existing?.accounts)
    ? uniqueSortedHex(existing.accounts as Hex[])
    : [];
  const nextAccounts = isActive
    ? uniqueSortedHex([...accounts, normalizedJuror])
    : accounts.filter((value) => value !== normalizedJuror);

  if (!existing) {
    await context.db
      .insert(stakeVaultJurorAudience)
      .values({
        id: normalizedVault,
        goalTreasury: goalTreasuryId,
        accounts: nextAccounts,
        updatedAtBlock: blockNumber,
        updatedAtTimestamp: blockTimestamp,
      })
      .onConflictDoNothing();
    return;
  }

  await context.db.update(stakeVaultJurorAudience, { id: normalizedVault }).set({
    goalTreasury: goalTreasuryId,
    accounts: nextAccounts,
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  });
}

export async function getGoalRow(args: {
  context: NotificationContext;
  goalTreasuryAddress: Hex | null | undefined;
}): Promise<GoalRow | null> {
  const goalTreasuryAddress = normalizeHexOrNull(args.goalTreasuryAddress);
  if (!goalTreasuryAddress) return null;
  const row = await args.context.db.find(goalTreasury, { id: goalTreasuryAddress });
  return toGoalRow(
    row as
      | {
          id: Hex;
          owner: Hex | null;
          stakeVault: Hex | null;
          canonicalRouteSlug: string | null;
        }
      | null
  );
}

export async function getGoalStakeholderAccounts(args: {
  context: NotificationContext;
  goalTreasuryAddress: Hex | null | undefined;
}): Promise<Hex[]> {
  const goalTreasuryAddress = normalizeHexOrNull(args.goalTreasuryAddress);
  if (!goalTreasuryAddress) return [];
  const audience = await args.context.db.find(goalStakeholderAudience, {
    id: goalTreasuryAddress,
  });
  return Array.isArray(audience?.accounts)
    ? uniqueSortedHex(audience.accounts as Hex[])
    : [];
}

export async function getBudgetUnderwriterAccounts(args: {
  context: NotificationContext;
  budgetTreasuryAddress: Hex | null | undefined;
}): Promise<Hex[]> {
  const budgetTreasuryAddress = normalizeHexOrNull(args.budgetTreasuryAddress);
  if (!budgetTreasuryAddress) return [];
  const audience = await args.context.db.find(budgetUnderwriterAudience, {
    id: budgetTreasuryAddress,
  });
  return Array.isArray(audience?.accounts)
    ? uniqueSortedHex(audience.accounts as Hex[])
    : [];
}

export async function getGoalUnderwriterAccounts(args: {
  context: NotificationContext;
  goalTreasuryAddress: Hex | null | undefined;
}): Promise<Hex[]> {
  const goalTreasuryAddress = normalizeHexOrNull(args.goalTreasuryAddress);
  if (!goalTreasuryAddress) return [];
  const audience = await args.context.db.find(goalUnderwriterAudience, {
    id: goalTreasuryAddress,
  });
  return Array.isArray(audience?.accounts)
    ? uniqueSortedHex(audience.accounts as Hex[])
    : [];
}

export async function getStakeVaultJurorAccounts(args: {
  context: NotificationContext;
  stakeVaultAddress: Hex | null | undefined;
}): Promise<Hex[]> {
  const stakeVaultAddress = normalizeHexOrNull(args.stakeVaultAddress);
  if (!stakeVaultAddress) return [];
  const audience = await args.context.db.find(stakeVaultJurorAudience, {
    id: stakeVaultAddress,
  });
  return Array.isArray(audience?.accounts)
    ? uniqueSortedHex(audience.accounts as Hex[])
    : [];
}

export async function getBudgetLifecycleNotificationContext(args: {
  context: NotificationContext;
  budgetTreasuryAddress: Hex | null | undefined;
}): Promise<{
  goalRow: GoalRow | null;
  budgetController: Hex | null;
  itemId: Hex | null;
  requester: Hex | null;
  proposer: Hex | null;
  requestIndex: bigint | null;
  stakeholderAccounts: Hex[];
  underwriterAccounts: Hex[];
}> {
  const budgetTreasuryAddress = normalizeHexOrNull(args.budgetTreasuryAddress);
  if (!budgetTreasuryAddress) {
    return {
      goalRow: null,
      budgetController: null,
      itemId: null,
      requester: null,
      proposer: null,
      requestIndex: null,
      stakeholderAccounts: [],
      underwriterAccounts: [],
    };
  }

  const [budgetRow, goalContext, underwriterAccounts] = await Promise.all([
    args.context.db.find(budgetTreasury, { id: budgetTreasuryAddress }),
    args.context.db.find(goalContextByBudgetTreasury, { id: budgetTreasuryAddress }),
    getBudgetUnderwriterAccounts({
      context: args.context,
      budgetTreasuryAddress,
    }),
  ]);

  const goalTreasuryAddress = normalizeHexOrNull(
    (goalContext?.goalTreasury ?? null) as Hex | null
  );
  const goalTreasuryRow = goalTreasuryAddress
    ? await args.context.db.find(goalTreasury, { id: goalTreasuryAddress })
    : null;
  const goalRow = toGoalRow(
    goalTreasuryRow as
      | {
          id: Hex;
          owner: Hex | null;
          stakeVault: Hex | null;
          canonicalRouteSlug: string | null;
        }
      | null
  );
  const stakeholderAccounts = goalRow
    ? await getGoalStakeholderAccounts({
        context: args.context,
        goalTreasuryAddress: goalRow.id,
      })
    : [];

  const budgetStakeLedger = normalizeHexOrNull(
    (goalTreasuryRow?.budgetStakeLedger ?? null) as Hex | null
  );
  const budgetTcrContext = budgetStakeLedger
    ? await args.context.db.find(goalContextByBudgetStakeLedger, { id: budgetStakeLedger })
    : null;
  const budgetTcr = normalizeHexOrNull((budgetTcrContext?.budgetTcr ?? null) as Hex | null);
  const itemId = normalizeHexOrNull((budgetRow?.recipientId ?? null) as Hex | null);
  const itemRow =
    budgetTcr && itemId
      ? await args.context.db.find(tcrItem, {
          id: `${budgetTcr.toLowerCase()}:${itemId.toLowerCase()}`,
        })
      : null;
  const requestIndexValue = itemRow?.latestRequestIndex;
  const requestIndex = typeof requestIndexValue === "bigint" ? requestIndexValue : null;
  const requestRow =
    budgetTcr && itemId && requestIndex !== null
      ? await args.context.db.find(tcrRequest, {
          id: `${budgetTcr.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}`,
        })
      : null;

  return {
    goalRow,
    budgetController: normalizeHexOrNull((budgetRow?.controller ?? null) as Hex | null),
    itemId,
    requester: normalizeHexOrNull((requestRow?.requester ?? null) as Hex | null),
    proposer: normalizeHexOrNull((itemRow?.submitter ?? null) as Hex | null),
    requestIndex,
    stakeholderAccounts,
    underwriterAccounts,
  };
}

export function buildGoalNotificationPayload(args: {
  role: RecipientRole;
  goalRow: GoalRow | null;
  reason: string;
  itemId?: Hex | null;
  requestIndex?: bigint | null;
  budgetTreasury?: Hex | null;
  actorWalletAddress?: Hex | null;
  arbitrator?: Hex | null;
  disputeId?: bigint | null;
  schedule?: {
    deliverAt?: bigint | null;
    votingStartTime?: bigint | null;
    votingEndTime?: bigint | null;
    revealPeriodEndTime?: bigint | null;
    challengeDeadline?: bigint | null;
    reassertGraceDeadline?: bigint | null;
  } | null;
  labels?: {
    budgetName?: string | null;
    mechanismName?: string | null;
    reminderContextLabel?: string | null;
  } | null;
  amounts?: {
    allocatedStake?: bigint | null;
    claimable?: bigint | null;
    claimedAmount?: bigint | null;
    snapshotWeight?: bigint | null;
    snapshotVotes?: bigint | null;
    slashWeight?: bigint | null;
    claimableReward?: bigint | null;
    claimableGoalSlashReward?: bigint | null;
    claimableCobuildSlashReward?: bigint | null;
    claimedReward?: bigint | null;
    claimedGoalSlashReward?: bigint | null;
    claimedCobuildSlashReward?: bigint | null;
  } | null;
}): Record<string, unknown> {
  const goalTreasuryAddress = normalizeHexOrNull((args.goalRow?.id ?? null) as Hex | null);
  const labels: Record<string, string | null> = {
    goalName:
      (typeof args.goalRow?.canonicalRouteSlug === "string" &&
      args.goalRow.canonicalRouteSlug.trim() !== ""
        ? args.goalRow.canonicalRouteSlug
        : null) ?? null,
  };

  if (args.labels && "budgetName" in args.labels) {
    labels.budgetName = args.labels.budgetName ?? null;
  }
  if (args.labels && "mechanismName" in args.labels) {
    labels.mechanismName = args.labels.mechanismName ?? null;
  }
  if (args.labels && "reminderContextLabel" in args.labels) {
    labels.reminderContextLabel = args.labels.reminderContextLabel ?? null;
  }

  const schedule: Record<string, string | null> | null = args.schedule
    ? {
        deliverAt: toStringOrNull(args.schedule.deliverAt ?? null),
        votingStartAt: toStringOrNull(args.schedule.votingStartTime ?? null),
        votingEndAt: toStringOrNull(args.schedule.votingEndTime ?? null),
        revealEndAt: toStringOrNull(args.schedule.revealPeriodEndTime ?? null),
      }
    : null;

  if (schedule && args.schedule && "challengeDeadline" in args.schedule) {
    schedule.challengeDeadlineAt = toStringOrNull(args.schedule.challengeDeadline ?? null);
  }
  if (schedule && args.schedule && "reassertGraceDeadline" in args.schedule) {
    schedule.reassertGraceDeadlineAt = toStringOrNull(args.schedule.reassertGraceDeadline ?? null);
  }

  const amounts: Record<string, string | null> | null = args.amounts
    ? {
        allocatedStake: toStringOrNull(args.amounts.allocatedStake ?? null),
        claimable: toStringOrNull(args.amounts.claimable ?? null),
        claimedAmount: toStringOrNull(args.amounts.claimedAmount ?? null),
        snapshotWeight: toStringOrNull(args.amounts.snapshotWeight ?? null),
        snapshotVotes: toStringOrNull(args.amounts.snapshotVotes ?? null),
        slashWeight: toStringOrNull(args.amounts.slashWeight ?? null),
      }
    : null;

  if (amounts && args.amounts && "claimableReward" in args.amounts) {
    amounts.claimableReward = toStringOrNull(args.amounts.claimableReward ?? null);
  }
  if (amounts && args.amounts && "claimableGoalSlashReward" in args.amounts) {
    amounts.claimableGoalSlashReward = toStringOrNull(
      args.amounts.claimableGoalSlashReward ?? null
    );
  }
  if (amounts && args.amounts && "claimableCobuildSlashReward" in args.amounts) {
    amounts.claimableCobuildSlashReward = toStringOrNull(
      args.amounts.claimableCobuildSlashReward ?? null
    );
  }
  if (amounts && args.amounts && "claimedReward" in args.amounts) {
    amounts.claimedReward = toStringOrNull(args.amounts.claimedReward ?? null);
  }
  if (amounts && args.amounts && "claimedGoalSlashReward" in args.amounts) {
    amounts.claimedGoalSlashReward = toStringOrNull(args.amounts.claimedGoalSlashReward ?? null);
  }
  if (amounts && args.amounts && "claimedCobuildSlashReward" in args.amounts) {
    amounts.claimedCobuildSlashReward = toStringOrNull(
      args.amounts.claimedCobuildSlashReward ?? null
    );
  }

  return {
    role: args.role,
    resource: {
      kind: resourceKindForReason(args.reason),
      goalTreasury: goalTreasuryAddress,
      budgetTreasury: normalizeHexOrNull(args.budgetTreasury),
      itemId: normalizeHexOrNull(args.itemId),
      requestIndex: toStringOrNull(args.requestIndex),
      arbitrator: normalizeHexOrNull(args.arbitrator),
      disputeId: toStringOrNull(args.disputeId),
    },
    actor: args.actorWalletAddress
      ? {
          walletAddress: normalizeHex(args.actorWalletAddress),
        }
      : null,
    labels,
    schedule,
    amounts,
  };
}

export function collectRecipientRoles(args: {
  goalOwner?: Hex | null;
  budgetController?: Hex | null;
  stakeholderAccounts?: readonly Hex[];
  goalUnderwriterAccounts?: readonly Hex[];
  budgetUnderwriterAccounts?: readonly Hex[];
  jurorAccounts?: readonly Hex[];
  requestActors?: Array<{
    address: Hex | null | undefined;
    role: "requester" | "challenger" | "proposer";
  }>;
}): Array<{ recipientWalletAddress: Hex; role: RecipientRole }> {
  const recipients = new Map<Hex, RecipientRole>();

  const assign = (address: Hex | null | undefined, role: RecipientRole) => {
    const normalized = normalizeHexOrNull(address);
    if (!normalized) return;
    const existing = recipients.get(normalized);
    if (!existing || ROLE_PRIORITY[role] > ROLE_PRIORITY[existing]) {
      recipients.set(normalized, role);
    }
  };

  for (const stakeholder of args.stakeholderAccounts ?? []) {
    assign(stakeholder, "goal_stakeholder");
  }

  for (const underwriter of args.goalUnderwriterAccounts ?? []) {
    assign(underwriter, "goal_underwriter");
  }

  for (const underwriter of args.budgetUnderwriterAccounts ?? []) {
    assign(underwriter, "budget_underwriter");
  }

  for (const jurorAddress of args.jurorAccounts ?? []) {
    assign(jurorAddress, "juror");
  }

  assign(args.goalOwner ?? null, "goal_owner");
  assign(args.budgetController ?? null, "budget_controller");

  for (const actor of args.requestActors ?? []) {
    assign(actor.address, actor.role);
  }

  return Array.from(recipients.entries()).map(([recipientWalletAddress, role]) => ({
    recipientWalletAddress,
    role,
  }));
}

type PendingNotification = {
  recipientWalletAddress: Hex;
  reason: string;
  sourceType: string;
  sourceId: string;
  notificationClass?: NotificationClass;
  action?: NotificationAction;
  actorWalletAddress?: Hex | null;
  payload: Record<string, unknown>;
};

type PendingScheduledNotification = PendingNotification & {
  deliverAt: bigint;
};

export async function emitProtocolNotifications(args: {
  context: NotificationContext;
  event: NotificationEvent;
  notifications: PendingNotification[];
}): Promise<void> {
  const { context, event, notifications } = args;
  if (notifications.length === 0) return;

  await Promise.all(
    notifications.map((notification) =>
      context.db
        .insert(protocolNotificationOutbox)
        .values({
          id: protocolNotificationOutboxId({
            txHash: event.transaction.hash as Hex,
            logIndex: event.log.logIndex,
            sourceType: notification.sourceType,
            sourceId: notification.sourceId,
            recipientWalletAddress: notification.recipientWalletAddress,
            action: notification.action ?? "upsert",
          }),
          chainId: context.chain.id,
          blockNumber: event.block.number,
          timestamp: event.block.timestamp,
          txHash: event.transaction.hash,
          logIndex: event.log.logIndex,
          recipientWalletAddress: normalizeHex(notification.recipientWalletAddress),
          notificationClass: notification.notificationClass ?? "edge",
          action: notification.action ?? "upsert",
          reason: notification.reason,
          sourceType: notification.sourceType,
          sourceId: notification.sourceId,
          actorWalletAddress: normalizeHexOrNull(notification.actorWalletAddress),
          payload: toJson(notification.payload),
        })
        .onConflictDoNothing()
    )
  );
}

export async function emitProtocolNotificationSchedules(args: {
  context: NotificationContext;
  event: NotificationEvent;
  notifications: PendingScheduledNotification[];
}): Promise<void> {
  const { context, event, notifications } = args;
  if (notifications.length === 0) return;

  await Promise.all(
    notifications.map((notification) =>
      context.db
        .insert(protocolNotificationSchedule)
        .values({
          id: protocolNotificationScheduleId({
            sourceType: notification.sourceType,
            sourceId: notification.sourceId,
            recipientWalletAddress: notification.recipientWalletAddress,
          }),
          chainId: context.chain.id,
          blockNumber: event.block.number,
          timestamp: event.block.timestamp,
          txHash: event.transaction.hash,
          logIndex: event.log.logIndex,
          deliverAt: notification.deliverAt,
          recipientWalletAddress: normalizeHex(notification.recipientWalletAddress),
          reason: notification.reason,
          sourceType: notification.sourceType,
          sourceId: notification.sourceId,
          actorWalletAddress: normalizeHexOrNull(notification.actorWalletAddress),
          payload: toJson(notification.payload),
        })
        .onConflictDoNothing()
    )
  );
}
