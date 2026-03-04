import { createConfig, factory } from "ponder";
import { config, getChainsAndRpcUrls, IndexerConfig } from "./src/lib/config";
import {
  budgetStakeLedgerAbi as BudgetStakeLedgerAbi,
  budgetTcrAbi as BudgetTCRAbi,
  budgetTcrFactoryAbi as BudgetTCRFactoryAbi,
  budgetTreasuryAbi as BudgetTreasuryAbi,
  cobuildSwapImplAbi,
  flowAbi as FlowAbi,
  goalFactoryAbi as GoalFactoryAbi,
  goalFlowAllocationLedgerPipelineAbi as GoalFlowAllocationLedgerPipelineAbi,
  goalRevnetSplitHookAbi as GoalRevnetSplitHookAbi,
  goalStakeVaultAbi as GoalStakeVaultAbi,
  goalTreasuryAbi as GoalTreasuryAbi,
  jurorSlasherRouterAbi as JurorSlasherRouterAbi,
  premiumEscrowAbi as PremiumEscrowAbi,
  umaTreasurySuccessResolverAbi as UmaTreasurySuccessResolverAbi,
  underwriterSlasherRouterAbi as UnderwriterSlasherRouterAbi,
} from "@cobuild/wire";
import { contracts } from "./addresses";
import { erc20Abi, getAbiItem, parseAbiItem } from "viem";
import {
  jbControllerAbi,
  jbMultiTerminalAbi,
  jbProjectsAbi,
  jbRulesetsAbi,
  jbSuckerRegistryAbi,
  jbTokensAbi,
  revDeployerAbi,
  revLoansAbi,
} from "juice-sdk-core";

const BASE_PROJECT_IDS: bigint[] = [6n];
const BASE_JB_PROJECT_TOKEN_ADDRESSES = [
  "0x794FDDbe0609CD704d7920eB3f950a57D4661193",
] as const;

/**
 * Placeholder deployment addresses for scaffold contracts.
 * Replace with real deployments and start blocks when available.
 */
const ADDRESSES = {
  GOAL_FACTORY: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  GOAL_FLOW: "0x1111111111111111111111111111111111111111",
  GOAL_TREASURY: "0x2222222222222222222222222222222222222222",
  GOAL_STAKE_VAULT: "0x3333333333333333333333333333333333333333",
  BUDGET_STAKE_LEDGER: "0x5555555555555555555555555555555555555555",
  BUDGET_TCR: "0x6666666666666666666666666666666666666666",
  BUDGET_TCR_FACTORY: "0x7777777777777777777777777777777777777777",
  ALLOCATION_PIPELINE: "0x8888888888888888888888888888888888888888",
  GOAL_HOOK: "0x9999999999999999999999999999999999999999",
} as const;

const CHILD_FLOW_DEPLOYED = parseAbiItem(
  "event ChildFlowDeployed(bytes32 indexed recipientId, address indexed recipient, address indexed strategy, address recipientAdmin, address flowOperator, address sweeper, address managerRewardPool)"
);

const BUDGET_STACK_DEPLOYED = parseAbiItem(
  "event BudgetStackDeployed(bytes32 indexed itemID, address indexed childFlow, address indexed budgetTreasury, address strategy)"
);

const GOAL_DEPLOYED = getAbiItem({
  abi: GoalFactoryAbi,
  name: "GoalDeployed",
});

type GoalFactoryStackAddressParameter =
  | "stack.goalTreasury"
  | "stack.successResolver"
  | "stack.underwriterSlasherRouter"
  | "stack.jurorSlasherRouter";

const goalFactoryStackAddress = (parameter: GoalFactoryStackAddressParameter) =>
  factory({
    address: ADDRESSES.GOAL_FACTORY,
    event: GOAL_DEPLOYED,
    parameter,
  });

export default createConfig({
  ordering: "omnichain",
  chains: getChainsAndRpcUrls(),
  contracts: {
    REVDeployer: {
      chain: {
        ...config.RevDeployer,
        base: {
          ...config.RevDeployer.base,
          filter: [
            { event: "DeployRevnet", args: { revnetId: BASE_PROJECT_IDS } },
          ],
        },
      },
      abi: revDeployerAbi,
      address: contracts.REVDeployer,
    },
    JBTokens: {
      chain: {
        ...config.JBTokens,
        base: {
          ...config.JBTokens.base,
          filter: [
            { event: "DeployERC20", args: { projectId: BASE_PROJECT_IDS } },
            { event: "Mint", args: { projectId: BASE_PROJECT_IDS } },
            { event: "Burn", args: { projectId: BASE_PROJECT_IDS } },
          ],
        },
      },
      abi: jbTokensAbi,
      address: contracts.JBTokens,
    },
    JBProjects: {
      chain: config.JBProjects,
      abi: jbProjectsAbi,
      address: contracts.JBProjects,
    },
    JBController: {
      chain: {
        ...config.JBController,
        base: {
          ...config.JBController.base,
          filter: [
            { event: "LaunchProject", args: {} },
            { event: "MintTokens", args: { projectId: BASE_PROJECT_IDS } },
            {
              event: "SendReservedTokensToSplits",
              args: { projectId: BASE_PROJECT_IDS },
            },
            { event: "SetUri", args: { projectId: BASE_PROJECT_IDS } },
          ],
        },
      },
      abi: jbControllerAbi,
      address: contracts.JBController,
    },
    ERC20: {
      abi: erc20Abi,
      address: BASE_JB_PROJECT_TOKEN_ADDRESSES,
      chain: config.ERC20,
    },
    JBMultiTerminal: {
      chain: {
        ...config.JBMultiTerminal,
        base: {
          ...config.JBMultiTerminal.base,
          filter: [
            { event: "AddToBalance", args: { projectId: BASE_PROJECT_IDS } },
            { event: "CashOutTokens", args: { projectId: BASE_PROJECT_IDS } },
            { event: "Pay", args: { projectId: BASE_PROJECT_IDS } },
            { event: "SendPayouts", args: { projectId: BASE_PROJECT_IDS } },
            {
              event: "SetAccountingContext",
              args: { projectId: BASE_PROJECT_IDS },
            },
            { event: "UseAllowance", args: { projectId: BASE_PROJECT_IDS } },
          ],
        },
      },
      abi: jbMultiTerminalAbi,
      address: contracts.JBMultiTerminal,
    },
    JBRulesets: {
      chain: {
        ...config.JBRulesets,
        base: {
          ...config.JBRulesets.base,
          filter: [
            { event: "RulesetQueued", args: { projectId: BASE_PROJECT_IDS } },
            {
              event: "RulesetInitialized",
              args: { projectId: BASE_PROJECT_IDS },
            },
          ],
        },
      },
      abi: jbRulesetsAbi,
      address: contracts.JBRulesets,
    },
    RevLoans: {
      chain: {
        ...config.RevLoans,
        base: {
          ...config.RevLoans.base,
          filter: [
            { event: "Borrow", args: { revnetId: BASE_PROJECT_IDS } },
            { event: "Liquidate", args: { revnetId: BASE_PROJECT_IDS } },
            {
              event: "ReallocateCollateral",
              args: { revnetId: BASE_PROJECT_IDS },
            },
            { event: "RepayLoan", args: { revnetId: BASE_PROJECT_IDS } },
            { event: "Transfer", args: {} },
          ],
        },
      },
      abi: revLoansAbi,
      address: contracts.REVLoans,
    },
    JBSuckersRegistry: {
      chain: config.JBSuckerRegistry,
      abi: jbSuckerRegistryAbi,
      address: contracts.JBSuckerRegistry,
    },
    CobuildSwap: {
      chain: "base",
      abi: cobuildSwapImplAbi,
      address: contracts.CobuildSwap,
      startBlock: IndexerConfig.CobuildSwap.base.startBlock,
    },
    TokenBought: {
      abi: erc20Abi,
      address: factory({
        address: contracts.CobuildSwap,
        event: getAbiItem({
          abi: cobuildSwapImplAbi,
          name: "BatchReactionSwap",
        }),
        parameter: "tokenOut",
      }),
      filter: {
        event: "Transfer",
        args: { from: contracts.CobuildSwap },
      },
      chain: "base",
      startBlock: IndexerConfig.CobuildSwap.base.startBlock,
    },

    // Integrated scaffold stack (goal/budget flows + telemetry)
    GoalFactory: {
      abi: GoalFactoryAbi,
      chain: "base",
      address: ADDRESSES.GOAL_FACTORY,
      startBlock: 0,
    },
    GoalFlow: {
      abi: FlowAbi,
      chain: "base",
      address: ADDRESSES.GOAL_FLOW,
      startBlock: 0,
    },
    ChildFlow: {
      abi: FlowAbi,
      chain: "base",
      address: factory({
        address: ADDRESSES.GOAL_FLOW,
        event: CHILD_FLOW_DEPLOYED,
        parameter: "recipient",
      }),
      startBlock: 0,
    },
    GoalTreasury: {
      abi: GoalTreasuryAbi,
      chain: "base",
      address: ADDRESSES.GOAL_TREASURY,
      startBlock: 0,
    },
    GoalTreasuryDiscovery: {
      abi: GoalTreasuryAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.goalTreasury"),
      startBlock: 0,
    },
    UMATreasurySuccessResolver: {
      abi: UmaTreasurySuccessResolverAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.successResolver"),
      startBlock: 0,
    },
    UnderwriterSlasherRouter: {
      abi: UnderwriterSlasherRouterAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.underwriterSlasherRouter"),
      startBlock: 0,
    },
    JurorSlasherRouter: {
      abi: JurorSlasherRouterAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.jurorSlasherRouter"),
      startBlock: 0,
    },
    GoalStakeVault: {
      abi: GoalStakeVaultAbi,
      chain: "base",
      address: ADDRESSES.GOAL_STAKE_VAULT,
      startBlock: 0,
    },
    PremiumEscrow: {
      abi: PremiumEscrowAbi,
      chain: "base",
      address: factory({
        address: ADDRESSES.GOAL_FLOW,
        event: CHILD_FLOW_DEPLOYED,
        parameter: "managerRewardPool",
      }),
      startBlock: 0,
    },
    GoalRevnetSplitHook: {
      abi: GoalRevnetSplitHookAbi,
      chain: "base",
      address: ADDRESSES.GOAL_HOOK,
      startBlock: 0,
    },
    GoalFlowAllocationLedgerPipeline: {
      abi: GoalFlowAllocationLedgerPipelineAbi,
      chain: "base",
      address: ADDRESSES.ALLOCATION_PIPELINE,
      startBlock: 0,
    },
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
  },
  blocks: {
    CheckRulesetBase: {
      chain: "base",
      startBlock: "latest",
      interval: 600 / 2, // Every 10 minutes (base block time is 2s)
    },
    FlowActualRateRefresh: {
      chain: "base",
      startBlock: "latest",
      interval: 120 / 2, // Every 2 minutes (base block time is 2s)
    },
  },
});
