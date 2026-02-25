import { onchainTable } from "ponder";

/**
 * Core event log table (JSON args are BigInt-safe stringified in handlers).
 */
export const protocolEvent = onchainTable("protocol_event", (t) => ({
  id: t.text().primaryKey(), // event.id (globally unique)
  chainId: t.integer().notNull(),
  contractName: t.text().notNull(),
  contractAddress: t.hex().notNull(),
  eventName: t.text().notNull(),
  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  args: t.json().notNull(),
}));

/**
 * Flow entity state (1 row per Flow contract address).
 */
export const flow = onchainTable("flow", (t) => ({
  id: t.hex().primaryKey(), // Flow contract address

  kind: t.text(), // "goal" | "child" | "unknown" (set by handlers)

  parentFlow: t.hex(), // nullable

  // From FlowInitialized
  initialOwner: t.hex(),
  initialFlowImpl: t.hex(),
  initialRecipientManager: t.hex(),
  superToken: t.hex(),
  distributionPool: t.hex(),
  managerRewardPoolFlowRatePercent: t.integer(),
  flowOperator: t.hex(),
  sweeper: t.hex(),
  connectPoolAdmin: t.hex(),
  strategy: t.hex(),

  // Dynamic state
  currentFlowRate: t.bigint().notNull().default(0n), // int96 stored as bigint
  targetOutflowRate: t.bigint().notNull().default(0n), // int96 stored as bigint

  createdAtBlock: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Recipient state within a flow (1 row per Flow x recipientId).
 * `distributionUnits` is intended to mirror Superfluid pool member units:
 *   DEFAULT_UNITS (10) + sum(computedUnits across allocation keys), or 0 if removed.
 */
export const flowRecipient = onchainTable("flow_recipient", (t) => ({
  id: t.text().primaryKey(), // `${flow}:${recipientId}`

  flowId: t.hex().notNull(),
  recipientId: t.hex().notNull(), // bytes32
  recipient: t.hex().notNull(), // address

  recipientIndex: t.integer().notNull(), // 0-based
  recipientType: t.integer().notNull(), // uint8 enum in contract
  isRemoved: t.boolean().notNull().default(false),

  // Metadata
  title: t.text(),
  description: t.text(),
  image: t.text(),
  tagline: t.text(),
  url: t.text(),

  // Flow-recipient specific fields
  isFlowRecipient: t.boolean().notNull().default(false),
  childDistributionPool: t.hex(),
  childStrategy: t.hex(),
  childManagerRewardPoolFlowRatePercent: t.integer(),

  // Pool units bookkeeping
  allocationUnitsSum: t.bigint().notNull().default(0n), // sum of computed units across allocation keys
  distributionUnits: t.bigint().notNull().default(0n), // DEFAULT_UNITS + allocationUnitsSum (or 0 when removed)

  createdAtBlock: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
  removedAtBlock: t.bigint(),
  removedAtTimestamp: t.bigint(),
}));

/**
 * State for an allocation key (Flow x strategy x allocationKey).
 * Stores the latest commitment/weight/snapshot needed to compute deltas.
 */
export const allocationKeyState = onchainTable("allocation_key_state", (t) => ({
  id: t.text().primaryKey(), // `${flow}:${strategy}:${allocationKey}`

  flowId: t.hex().notNull(),
  strategy: t.hex().notNull(),
  allocationKey: t.bigint().notNull(),

  commitment: t.hex().notNull(), // bytes32
  weight: t.bigint().notNull(),
  packedSnapshot: t.hex().notNull(), // bytes as 0x…

  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Per-recipient state for an allocation key (Flow x strategy x allocationKey x recipientId).
 * Stores the latest scaled allocation and computed units (EXCLUDING the DEFAULT_UNITS baseline).
 */
export const allocationEntryState = onchainTable("allocation_entry_state", (t) => ({
  id: t.text().primaryKey(), // `${flow}:${strategy}:${allocationKey}:${recipientId}`

  flowId: t.hex().notNull(),
  strategy: t.hex().notNull(),
  allocationKey: t.bigint().notNull(),

  recipientId: t.hex().notNull(),
  recipient: t.hex().notNull(),
  recipientIndex: t.integer().notNull(),

  allocationScaled: t.integer().notNull(), // uint32
  computedUnits: t.bigint().notNull(), // computed units for THIS allocationKey (no baseline)

  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Budget stack entity (one per TCR itemID).
 */
export const budgetStack = onchainTable("budget_stack", (t) => ({
  id: t.hex().primaryKey(), // itemID / recipientId (bytes32)

  childFlow: t.hex(),
  budgetTreasury: t.hex(),
  stakeVault: t.hex(),
  strategy: t.hex(),

  status: t.text(), // "DEPLOYED" | "ACTIVE" | "REMOVAL_QUEUED" | "REMOVED" etc.

  deployedAtBlock: t.bigint(),
  deployedAtTimestamp: t.bigint(),
  updatedAtBlock: t.bigint(),
  updatedAtTimestamp: t.bigint(),
}));

/**
 * Budget treasury state (1 row per BudgetTreasury address).
 */
export const budgetTreasury = onchainTable("budget_treasury", (t) => ({
  id: t.hex().primaryKey(),

  recipientId: t.hex(), // bytes32 (budgetId)
  childFlow: t.hex(),
  budgetOwner: t.hex(),
  goalToken: t.hex(),
  cobuildToken: t.hex(),
  stakeVault: t.hex(),
  strategy: t.hex(),

  budgetStart: t.bigint(),
  budgetDuration: t.bigint(),

  state: t.integer(), // uint8
  finalized: t.boolean().notNull().default(false),

  successAssertionId: t.hex(),
  successResolutionDisabled: t.boolean().notNull().default(false),

  lastSyncedWeight: t.bigint().notNull().default(0n),
  lastSyncedFlowRate: t.bigint().notNull().default(0n),

  createdAtBlock: t.bigint(),
  createdAtTimestamp: t.bigint(),
  updatedAtBlock: t.bigint(),
  updatedAtTimestamp: t.bigint(),
}));

/**
 * Goal treasury state (1 row per GoalTreasury address).
 */
export const goalTreasury = onchainTable("goal_treasury", (t) => ({
  id: t.hex().primaryKey(),

  recipientId: t.hex(),
  goalToken: t.hex(),
  cobuildToken: t.hex(),
  stakeVault: t.hex(),
  rewardEscrow: t.hex(),
  hook: t.hex(),
  strategy: t.hex(),
  parentFlow: t.hex(),

  state: t.integer(),
  finalized: t.boolean().notNull().default(false),

  // Latest finalized success rewards (if any)
  successGoalAmount: t.bigint().notNull().default(0n),
  successCobuildAmount: t.bigint().notNull().default(0n),
  successTotalGoalStaked: t.bigint().notNull().default(0n),
  successTotalCobuildStaked: t.bigint().notNull().default(0n),

  successAssertionId: t.hex(),
  jurorSlasher: t.hex(),

  lastSyncedWeight: t.bigint().notNull().default(0n),
  lastSyncedFlowRate: t.bigint().notNull().default(0n),

  createdAtBlock: t.bigint(),
  createdAtTimestamp: t.bigint(),
  updatedAtBlock: t.bigint(),
  updatedAtTimestamp: t.bigint(),
}));

/**
 * Stake vault aggregate state (GoalStakeVault instances, both goal and budget vaults).
 */
export const stakeVault = onchainTable("stake_vault", (t) => ({
  id: t.hex().primaryKey(),

  kind: t.text(), // "goal" | "budget" | "unknown"
  treasury: t.hex(), // nullable

  goalTotalStaked: t.bigint().notNull().default(0n),
  cobuildTotalStaked: t.bigint().notNull().default(0n),
  goalTotalWithdrawn: t.bigint().notNull().default(0n),
  cobuildTotalWithdrawn: t.bigint().notNull().default(0n),

  resolved: t.boolean().notNull().default(false),

  updatedAtBlock: t.bigint(),
  updatedAtTimestamp: t.bigint(),
}));

/**
 * Per-account stake position within a vault.
 */
export const stakePosition = onchainTable("stake_position", (t) => ({
  id: t.text().primaryKey(), // `${vault}:${account}:${tokenKind}`

  vault: t.hex().notNull(),
  account: t.hex().notNull(),
  tokenKind: t.text().notNull(), // "goal" | "cobuild"

  staked: t.bigint().notNull().default(0n),
  withdrawn: t.bigint().notNull().default(0n),

  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Juror state within a stake vault.
 */
export const juror = onchainTable("juror", (t) => ({
  id: t.text().primaryKey(), // `${vault}:${juror}`

  vault: t.hex().notNull(),
  jurorAddress: t.hex().notNull(),

  optedIn: t.boolean().notNull().default(false),
  exitTime: t.bigint(), // uint64
  delegate: t.hex(),
  slasher: t.hex(),
  slashedTotal: t.bigint().notNull().default(0n),

  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Reward escrow aggregate state.
 */
export const rewardEscrow = onchainTable("reward_escrow", (t) => ({
  id: t.hex().primaryKey(),

  goalReward: t.bigint().notNull().default(0n),
  cobuildReward: t.bigint().notNull().default(0n),
  totalGoalStaked: t.bigint().notNull().default(0n),
  totalCobuildStaked: t.bigint().notNull().default(0n),

  goalToken: t.hex(),
  cobuildToken: t.hex(),

  finalized: t.boolean().notNull().default(false),

  lastUnwrapAmountIn: t.bigint().notNull().default(0n),
  lastUnwrapAmountOut: t.bigint().notNull().default(0n),

  updatedAtBlock: t.bigint(),
  updatedAtTimestamp: t.bigint(),
}));

/**
 * Reward claim event rows.
 */
export const rewardClaim = onchainTable("reward_claim", (t) => ({
  id: t.text().primaryKey(), // event.id

  escrow: t.hex().notNull(),
  account: t.hex().notNull(),
  amount: t.bigint().notNull(),
  isGoalToken: t.boolean().notNull(),

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

/**
 * Donation rows (goal + budget treasuries).
 */
export const donation = onchainTable("donation", (t) => ({
  id: t.text().primaryKey(), // event.id

  kind: t.text().notNull(), // "goal" | "budget"
  treasury: t.hex().notNull(),
  donor: t.hex().notNull(),
  amount: t.bigint().notNull(),
  token: t.hex().notNull(),
  memo: t.hex().notNull(), // bytes32
  metadata: t.hex().notNull(), // bytes

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

/**
 * Goal hook funding bookkeeping from GoalTreasury events (recorded/deferred/settled).
 */
export const hookFunding = onchainTable("hook_funding", (t) => ({
  id: t.text().primaryKey(), // event.id

  goalTreasury: t.hex().notNull(),
  kind: t.text().notNull(), // "RECORDED" | "DEFERRED" | "SETTLED"
  amount: t.bigint().notNull(),
  token: t.hex().notNull(),
  beneficiary: t.hex(), // only for SETTLED

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

/**
 * Pipeline sync telemetry from GoalFlowAllocationLedgerPipeline.
 */
export const pipelineSync = onchainTable("pipeline_sync", (t) => ({
  id: t.text().primaryKey(), // event.id

  eventName: t.text().notNull(),

  childRecipientId: t.hex(),
  childFlow: t.hex(),

  parentRecipientId: t.hex(),
  parentFlow: t.hex(),
  parentStrategy: t.hex(),
  parentAllocationKey: t.bigint(),

  commitment: t.hex(),
  weight: t.bigint(),
  childAllocationKey: t.bigint(),

  budgetTreasury: t.hex(),

  success: t.boolean(),
  reason: t.integer(),

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

/**
 * Allocation checkpointing from BudgetStakeLedger (useful for time-series).
 */
export const allocationCheckpoint = onchainTable("allocation_checkpoint", (t) => ({
  id: t.text().primaryKey(), // event.id

  budgetId: t.hex().notNull(),
  allocationKey: t.bigint().notNull(),
  allocation: t.bigint().notNull(),
  checkpointTimestamp: t.bigint().notNull(),
  caller: t.hex().notNull(),

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

/**
 * Hook processing rows from GoalRevnetSplitHook.
 */
export const hookProcess = onchainTable("hook_process", (t) => ({
  id: t.text().primaryKey(), // event.id

  eventName: t.text().notNull(), // GoalFundingProcessed | GoalSuccessSettlementProcessed
  recipientId: t.hex().notNull(),
  caller: t.hex().notNull(),
  amount: t.bigint().notNull(),
  token: t.hex().notNull(),

  beneficiary: t.hex(),
  succeeded: t.boolean(),

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));
