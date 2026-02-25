import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";

import { FlowAbi } from "./abis/Flow";
import { GoalTreasuryAbi } from "./abis/GoalTreasury";
import { BudgetTreasuryAbi } from "./abis/BudgetTreasury";
import { RewardEscrowAbi } from "./abis/RewardEscrow";
import { GoalStakeVaultAbi } from "./abis/GoalStakeVault";
import { BudgetStakeLedgerAbi } from "./abis/BudgetStakeLedger";
import { BudgetTCRAbi } from "./abis/BudgetTCR";
import { BudgetTCRFactoryAbi } from "./abis/BudgetTCRFactory";
import { GoalFlowAllocationLedgerPipelineAbi } from "./abis/GoalFlowAllocationLedgerPipeline";
import { GoalRevnetSplitHookAbi } from "./abis/GoalRevnetSplitHook";
import { SingleAllocatorStrategyAbi } from "./abis/SingleAllocatorStrategy";

/**
 * Placeholder deployment addresses (replace with real addresses + start blocks).
 */
const ADDRESSES = {
  GOAL_FLOW: "0x1111111111111111111111111111111111111111",
  GOAL_TREASURY: "0x2222222222222222222222222222222222222222",
  GOAL_STAKE_VAULT: "0x3333333333333333333333333333333333333333",
  REWARD_ESCROW: "0x4444444444444444444444444444444444444444",
  BUDGET_STAKE_LEDGER: "0x5555555555555555555555555555555555555555",
  BUDGET_TCR: "0x6666666666666666666666666666666666666666",
  BUDGET_TCR_FACTORY: "0x7777777777777777777777777777777777777777",
  ALLOCATION_PIPELINE: "0x8888888888888888888888888888888888888888",
  GOAL_HOOK: "0x9999999999999999999999999999999999999999",
  SINGLE_ALLOCATOR_STRATEGY: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
} as const;

/**
 * Factory discovery events.
 */
const FLOW_RECIPIENT_CREATED = parseAbiItem(
  "event FlowRecipientCreated(bytes32 indexed recipientId, address indexed recipient, (address recipient, address distributionPool, uint32 managerRewardPoolFlowRatePercent, address strategy) flowRecipient)"
);

const BUDGET_STACK_DEPLOYED = parseAbiItem(
  "event BudgetStackDeployed(bytes32 indexed itemID, address indexed childFlow, address indexed budgetTreasury, address stakeVault, address strategy)"
);

export default createConfig({
  chains: {
    base: {
      id: 8453,
      rpc: process.env.PONDER_RPC_URL_8453,
    },
  },
  contracts: {
    /** Root / goal flow */
    GoalFlow: {
      abi: FlowAbi,
      chain: "base",
      address: ADDRESSES.GOAL_FLOW,
      startBlock: 0,
    },

    /** Dynamically discovered child flows (Flow recipients) */
    ChildFlow: {
      abi: FlowAbi,
      chain: "base",
      address: factory({
        address: ADDRESSES.GOAL_FLOW,
        event: FLOW_RECIPIENT_CREATED,
        parameter: "recipient",
      }),
      startBlock: 0,
    },

    /** Goal stack */
    GoalTreasury: {
      abi: GoalTreasuryAbi,
      chain: "base",
      address: ADDRESSES.GOAL_TREASURY,
      startBlock: 0,
    },
    GoalStakeVault: {
      abi: GoalStakeVaultAbi,
      chain: "base",
      address: ADDRESSES.GOAL_STAKE_VAULT,
      startBlock: 0,
    },
    RewardEscrow: {
      abi: RewardEscrowAbi,
      chain: "base",
      address: ADDRESSES.REWARD_ESCROW,
      startBlock: 0,
    },
    GoalRevnetSplitHook: {
      abi: GoalRevnetSplitHookAbi,
      chain: "base",
      address: ADDRESSES.GOAL_HOOK,
      startBlock: 0,
    },

    /** Allocation pipeline */
    GoalFlowAllocationLedgerPipeline: {
      abi: GoalFlowAllocationLedgerPipelineAbi,
      chain: "base",
      address: ADDRESSES.ALLOCATION_PIPELINE,
      startBlock: 0,
    },

    /** Budget system */
    BudgetStakeLedger: {
      abi: BudgetStakeLedgerAbi,
      chain: "base",
      address: ADDRESSES.BUDGET_STAKE_LEDGER,
      startBlock: 0,
    },
    BudgetTCRFactory: {
      abi: BudgetTCRFactoryAbi,
      chain: "base",
      address: ADDRESSES.BUDGET_TCR_FACTORY,
      startBlock: 0,
    },
    BudgetTCR: {
      abi: BudgetTCRAbi,
      chain: "base",
      address: ADDRESSES.BUDGET_TCR,
      startBlock: 0,
    },

    /** Dynamically discovered budget treasuries + vaults deployed by BudgetTCR */
    BudgetTreasury: {
      abi: BudgetTreasuryAbi,
      chain: "base",
      address: factory({
        address: ADDRESSES.BUDGET_TCR,
        event: BUDGET_STACK_DEPLOYED,
        parameter: "budgetTreasury",
      }),
      startBlock: 0,
    },
    BudgetStakeVault: {
      abi: GoalStakeVaultAbi,
      chain: "base",
      address: factory({
        address: ADDRESSES.BUDGET_TCR,
        event: BUDGET_STACK_DEPLOYED,
        parameter: "stakeVault",
      }),
      startBlock: 0,
    },

    /** Optional: index strategy-level events if you use SingleAllocatorStrategy */
    SingleAllocatorStrategy: {
      abi: SingleAllocatorStrategyAbi,
      chain: "base",
      address: ADDRESSES.SINGLE_ALLOCATOR_STRATEGY,
      startBlock: 0,
    },
  },
});
