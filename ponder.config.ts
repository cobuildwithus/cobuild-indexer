import { createConfig, factory } from "ponder";
import { config, getChainsAndRpcUrls, IndexerConfig } from "./src/lib/config";
import {
  baseEntrypoints,
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
 * Canonical scaffold entrypoint addresses from @cobuild/wire (v1-core deploys).
 */
const ENTRYPOINTS = {
  GOAL_FACTORY: baseEntrypoints.goalFactory,
  BUDGET_TCR_FACTORY: baseEntrypoints.budgetTcrFactory,
} as const;

const SCAFFOLD_START_BLOCK = 42_941_210;

// Factory discovery callbacks landed in v1-core may not be present in the
// currently published factory ABI surface, so these are pinned explicitly.
const GOAL_DEPLOYED = parseAbiItem(
  "event GoalDeployed(address indexed caller, uint256 indexed goalRevnetId, (uint256 goalRevnetId,address goalToken,address goalSuperToken,address goalTreasury,address goalFlow,address goalFlowAllocationLedgerPipeline,address stakeVault,address budgetStakeLedger,address splitHook,address jurorSlasherRouter,address underwriterSlasherRouter,address successResolver,address budgetTCR,address arbitrator) stack)"
);

const BUDGET_TCR_STACK_DEPLOYED_FOR_GOAL = getAbiItem({
  abi: BudgetTCRFactoryAbi,
  name: "BudgetTCRStackDeployedForGoal",
});

const BUDGET_STACK_DEPLOYED_FROM_FACTORY = parseAbiItem(
  "event BudgetStackDeployed(address indexed budgetTCR, bytes32 indexed itemID, address indexed childFlow, address budgetTreasury, address premiumEscrow, address strategy)"
);

type GoalFactoryStackAddressParameter =
  | "stack.goalFlow"
  | "stack.goalTreasury"
  | "stack.goalFlowAllocationLedgerPipeline"
  | "stack.stakeVault"
  | "stack.budgetStakeLedger"
  | "stack.splitHook"
  | "stack.successResolver"
  | "stack.underwriterSlasherRouter"
  | "stack.jurorSlasherRouter";

const goalFactoryStackAddress = (parameter: GoalFactoryStackAddressParameter) =>
  factory({
    address: ENTRYPOINTS.GOAL_FACTORY,
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
      address: ENTRYPOINTS.GOAL_FACTORY,
      startBlock: SCAFFOLD_START_BLOCK,
    },
    GoalFlow: {
      abi: FlowAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.goalFlow"),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    ChildFlow: {
      abi: FlowAbi,
      chain: "base",
      address: factory({
        address: ENTRYPOINTS.BUDGET_TCR_FACTORY,
        event: BUDGET_STACK_DEPLOYED_FROM_FACTORY,
        parameter: "childFlow",
      }),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    GoalTreasury: {
      abi: GoalTreasuryAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.goalTreasury"),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    UMATreasurySuccessResolver: {
      abi: UmaTreasurySuccessResolverAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.successResolver"),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    UnderwriterSlasherRouter: {
      abi: UnderwriterSlasherRouterAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.underwriterSlasherRouter"),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    JurorSlasherRouter: {
      abi: JurorSlasherRouterAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.jurorSlasherRouter"),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    GoalStakeVault: {
      abi: GoalStakeVaultAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.stakeVault"),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    PremiumEscrow: {
      abi: PremiumEscrowAbi,
      chain: "base",
      address: factory({
        address: ENTRYPOINTS.BUDGET_TCR_FACTORY,
        event: BUDGET_STACK_DEPLOYED_FROM_FACTORY,
        parameter: "premiumEscrow",
      }),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    GoalRevnetSplitHook: {
      abi: GoalRevnetSplitHookAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.splitHook"),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    GoalFlowAllocationLedgerPipeline: {
      abi: GoalFlowAllocationLedgerPipelineAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.goalFlowAllocationLedgerPipeline"),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    BudgetStakeLedger: {
      abi: BudgetStakeLedgerAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.budgetStakeLedger"),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    BudgetTCRFactory: {
      abi: BudgetTCRFactoryAbi,
      chain: "base",
      address: ENTRYPOINTS.BUDGET_TCR_FACTORY,
      startBlock: SCAFFOLD_START_BLOCK,
    },
    BudgetTCR: {
      abi: BudgetTCRAbi,
      chain: "base",
      address: factory({
        address: ENTRYPOINTS.BUDGET_TCR_FACTORY,
        event: BUDGET_TCR_STACK_DEPLOYED_FOR_GOAL,
        parameter: "budgetTCR",
      }),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    BudgetTreasury: {
      abi: BudgetTreasuryAbi,
      chain: "base",
      address: factory({
        address: ENTRYPOINTS.BUDGET_TCR_FACTORY,
        event: BUDGET_STACK_DEPLOYED_FROM_FACTORY,
        parameter: "budgetTreasury",
      }),
      startBlock: SCAFFOLD_START_BLOCK,
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
