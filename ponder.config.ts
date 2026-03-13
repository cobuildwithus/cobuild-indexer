import { createConfig, factory } from "ponder";
import { config, getChainsAndRpcUrls, IndexerConfig } from "./src/lib/config";
import {
  BASE_SCAFFOLD_START_BLOCK,
  COBUILD_TOKEN_ADDRESS,
  allocationMechanismTcrAbi as AllocationMechanismTCRAbi,
  budgetStakeLedgerAbi as BudgetStakeLedgerAbi,
  budgetTcrAbi as BudgetTCRAbi,
  budgetTcrFactoryAbi as BudgetTCRFactoryAbi,
  budgetTcrFactoryAddress,
  budgetTreasuryAbi as BudgetTreasuryAbi,
  cobuildSwapImplAbi,
  erc20VotesArbitratorAbi as ERC20VotesArbitratorAbi,
  flowAbi as FlowAbi,
  goalFactoryAbi as GoalFactoryAbi,
  goalFactoryAddress,
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
import { erc20Abi, getAbiItem, type Abi } from "viem";
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

const ROOT_PROJECT_TOKEN_ADDRESSES = [COBUILD_TOKEN_ADDRESS] as const;

const GOAL_DEPLOYED = getAbiItem({
  abi: GoalFactoryAbi,
  name: "GoalDeployed",
});

const GoalFactoryProtocolEventsAbi = [GOAL_DEPLOYED] as const satisfies Abi;

const BUDGET_TCR_STACK_DEPLOYED_FOR_GOAL = getAbiItem({
  abi: BudgetTCRFactoryAbi,
  name: "BudgetTCRStackDeployedForGoal",
});

const BUDGET_STACK_DEPLOYED_FROM_FACTORY = getAbiItem({
  abi: BudgetTCRFactoryAbi,
  name: "BudgetStackDeployed",
});

const BUDGET_ALLOCATION_MECHANISM_DEPLOYED_FROM_FACTORY = getAbiItem({
  abi: BudgetTCRFactoryAbi,
  name: "BudgetAllocationMechanismDeployed",
});

const BudgetTCRFactoryProtocolEventsAbi = [
  BUDGET_TCR_STACK_DEPLOYED_FOR_GOAL,
  BUDGET_STACK_DEPLOYED_FROM_FACTORY,
  BUDGET_ALLOCATION_MECHANISM_DEPLOYED_FROM_FACTORY,
] as const satisfies Abi;

const BUDGET_TCR_REQUEST_SUBMITTED = {
  type: "event",
  name: "RequestSubmitted",
  anonymous: false,
  inputs: [
    { indexed: true, internalType: "bytes32", name: "_itemID", type: "bytes32" },
    { indexed: true, internalType: "uint256", name: "_requestIndex", type: "uint256" },
    { indexed: true, internalType: "enum IGeneralizedTCR.Status", name: "_requestType", type: "uint8" },
    { indexed: false, internalType: "address", name: "_requester", type: "address" },
  ],
} as const satisfies Abi[number];

const BUDGET_TCR_DISPUTE = {
  type: "event",
  name: "Dispute",
  anonymous: false,
  inputs: [
    { indexed: true, internalType: "contract IArbitrator", name: "_arbitrator", type: "address" },
    { indexed: true, internalType: "uint256", name: "_disputeID", type: "uint256" },
    { indexed: false, internalType: "uint256", name: "_metaEvidenceID", type: "uint256" },
    { indexed: false, internalType: "uint256", name: "_evidenceGroupID", type: "uint256" },
    { indexed: false, internalType: "bytes32", name: "_itemID", type: "bytes32" },
    { indexed: false, internalType: "uint256", name: "_requestIndex", type: "uint256" },
    { indexed: false, internalType: "address", name: "_challenger", type: "address" },
  ],
} as const satisfies Abi[number];

const BudgetTCRProtocolEventsAbi = [
  BUDGET_TCR_REQUEST_SUBMITTED,
  BUDGET_TCR_DISPUTE,
] as const satisfies Abi;

type GoalFactoryStackAddressParameter =
  | "stack.goalToken"
  | "stack.arbitrator"
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
    address: goalFactoryAddress,
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
          filter: [{ event: "DeployRevnet", args: {} }],
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
            { event: "DeployERC20", args: {} },
            { event: "Mint", args: {} },
            { event: "Burn", args: {} },
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
            { event: "MintTokens", args: {} },
            { event: "SendReservedTokensToSplits", args: {} },
            { event: "SetUri", args: {} },
          ],
        },
      },
      abi: jbControllerAbi,
      address: contracts.JBController,
    },
    ERC20: {
      abi: erc20Abi,
      address: ROOT_PROJECT_TOKEN_ADDRESSES,
      chain: config.ERC20,
    },
    GoalToken: {
      abi: erc20Abi,
      chain: "base",
      address: goalFactoryStackAddress("stack.goalToken"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    JBMultiTerminal: {
      chain: {
        ...config.JBMultiTerminal,
        base: {
          ...config.JBMultiTerminal.base,
          filter: [
            { event: "AddToBalance", args: {} },
            { event: "CashOutTokens", args: {} },
            { event: "Pay", args: {} },
            { event: "SendPayouts", args: {} },
            { event: "SetAccountingContext", args: {} },
            { event: "UseAllowance", args: {} },
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
            { event: "RulesetQueued", args: {} },
            { event: "RulesetInitialized", args: {} },
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
            { event: "Borrow", args: {} },
            { event: "Liquidate", args: {} },
            { event: "ReallocateCollateral", args: {} },
            { event: "RepayLoan", args: {} },
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
      abi: GoalFactoryProtocolEventsAbi,
      chain: "base",
      address: goalFactoryAddress,
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    GoalFlow: {
      abi: FlowAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.goalFlow"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    ChildFlow: {
      abi: FlowAbi,
      chain: "base",
      address: factory({
        address: budgetTcrFactoryAddress,
        event: BUDGET_STACK_DEPLOYED_FROM_FACTORY,
        parameter: "childFlow",
      }),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    GoalTreasury: {
      abi: GoalTreasuryAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.goalTreasury"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    UMATreasurySuccessResolver: {
      abi: UmaTreasurySuccessResolverAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.successResolver"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    UnderwriterSlasherRouter: {
      abi: UnderwriterSlasherRouterAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.underwriterSlasherRouter"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    JurorSlasherRouter: {
      abi: JurorSlasherRouterAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.jurorSlasherRouter"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    GoalStakeVault: {
      abi: GoalStakeVaultAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.stakeVault"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    PremiumEscrow: {
      abi: PremiumEscrowAbi,
      chain: "base",
      address: factory({
        address: budgetTcrFactoryAddress,
        event: BUDGET_STACK_DEPLOYED_FROM_FACTORY,
        parameter: "premiumEscrow",
      }),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    GoalRevnetSplitHook: {
      abi: GoalRevnetSplitHookAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.splitHook"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    GoalFlowAllocationLedgerPipeline: {
      abi: GoalFlowAllocationLedgerPipelineAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.goalFlowAllocationLedgerPipeline"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    BudgetStakeLedger: {
      abi: BudgetStakeLedgerAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.budgetStakeLedger"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    BudgetTCRFactory: {
      abi: BudgetTCRFactoryProtocolEventsAbi,
      chain: "base",
      address: budgetTcrFactoryAddress,
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    BudgetTCR: {
      abi: BudgetTCRAbi,
      chain: "base",
      address: factory({
        address: budgetTcrFactoryAddress,
        event: BUDGET_TCR_STACK_DEPLOYED_FOR_GOAL,
        parameter: "budgetTCR",
      }),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    BudgetTCRProtocolEvents: {
      abi: BudgetTCRProtocolEventsAbi,
      chain: "base",
      address: factory({
        address: budgetTcrFactoryAddress,
        event: BUDGET_TCR_STACK_DEPLOYED_FOR_GOAL,
        parameter: "budgetTCR",
      }),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    ERC20VotesArbitrator: {
      abi: ERC20VotesArbitratorAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.arbitrator"),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    AllocationMechanismTCR: {
      abi: AllocationMechanismTCRAbi,
      chain: "base",
      address: factory({
        address: budgetTcrFactoryAddress,
        event: BUDGET_ALLOCATION_MECHANISM_DEPLOYED_FROM_FACTORY,
        parameter: "allocationMechanism",
      }),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    MechanismERC20VotesArbitrator: {
      abi: ERC20VotesArbitratorAbi,
      chain: "base",
      address: factory({
        address: budgetTcrFactoryAddress,
        event: BUDGET_ALLOCATION_MECHANISM_DEPLOYED_FROM_FACTORY,
        parameter: "allocationMechanismArbitrator",
      }),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    },
    BudgetTreasury: {
      abi: BudgetTreasuryAbi,
      chain: "base",
      address: factory({
        address: budgetTcrFactoryAddress,
        event: BUDGET_STACK_DEPLOYED_FROM_FACTORY,
        parameter: "budgetTreasury",
      }),
      startBlock: BASE_SCAFFOLD_START_BLOCK,
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
