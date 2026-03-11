import { createConfig, factory } from "ponder";
import { config, getChainsAndRpcUrls, IndexerConfig } from "./src/lib/config";
import {
  COBUILD_PROJECT_ID_BIGINT,
  allocationMechanismTcrAbi as AllocationMechanismTCRAbi,
  baseEntrypoints,
  budgetStakeLedgerAbi as BudgetStakeLedgerAbi,
  budgetTcrAbi as BudgetTCRAbi,
  budgetTcrFactoryAbi as BudgetTCRFactoryAbi,
  budgetTreasuryAbi as BudgetTreasuryAbi,
  cobuildSwapImplAbi,
  erc20VotesArbitratorAbi as ERC20VotesArbitratorAbi,
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
import { erc20Abi, getAbiItem, parseAbiItem, type Abi } from "viem";
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

const COBUILD_PROJECT_IDS: bigint[] = [COBUILD_PROJECT_ID_BIGINT];
const COBUILD_PROJECT_TOKEN_ADDRESSES = [contracts.CobuildToken] as const;

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

const BUDGET_ALLOCATION_MECHANISM_DEPLOYED_FROM_FACTORY = getAbiItem({
  abi: BudgetTCRFactoryAbi,
  name: "BudgetAllocationMechanismDeployed",
});

const BudgetTCRFactoryProtocolEventsAbi = [
  BUDGET_TCR_STACK_DEPLOYED_FOR_GOAL,
  BUDGET_STACK_DEPLOYED_FROM_FACTORY,
  BUDGET_ALLOCATION_MECHANISM_DEPLOYED_FROM_FACTORY,
] as const satisfies Abi;

// Published @cobuild/wire may lag the latest local protocol event cutover, so
// the changed BudgetTCR event fragments are pinned here until the next wire release.
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
            { event: "DeployRevnet", args: { revnetId: COBUILD_PROJECT_IDS } },
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
            { event: "DeployERC20", args: { projectId: COBUILD_PROJECT_IDS } },
            { event: "Mint", args: { projectId: COBUILD_PROJECT_IDS } },
            { event: "Burn", args: { projectId: COBUILD_PROJECT_IDS } },
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
            { event: "MintTokens", args: { projectId: COBUILD_PROJECT_IDS } },
            {
              event: "SendReservedTokensToSplits",
              args: { projectId: COBUILD_PROJECT_IDS },
            },
            { event: "SetUri", args: { projectId: COBUILD_PROJECT_IDS } },
          ],
        },
      },
      abi: jbControllerAbi,
      address: contracts.JBController,
    },
    ERC20: {
      abi: erc20Abi,
      address: COBUILD_PROJECT_TOKEN_ADDRESSES,
      chain: config.ERC20,
    },
    JBMultiTerminal: {
      chain: {
        ...config.JBMultiTerminal,
        base: {
          ...config.JBMultiTerminal.base,
          filter: [
            { event: "AddToBalance", args: { projectId: COBUILD_PROJECT_IDS } },
            { event: "CashOutTokens", args: { projectId: COBUILD_PROJECT_IDS } },
            { event: "Pay", args: { projectId: COBUILD_PROJECT_IDS } },
            { event: "SendPayouts", args: { projectId: COBUILD_PROJECT_IDS } },
            {
              event: "SetAccountingContext",
              args: { projectId: COBUILD_PROJECT_IDS },
            },
            { event: "UseAllowance", args: { projectId: COBUILD_PROJECT_IDS } },
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
            { event: "RulesetQueued", args: { projectId: COBUILD_PROJECT_IDS } },
            {
              event: "RulesetInitialized",
              args: { projectId: COBUILD_PROJECT_IDS },
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
            { event: "Borrow", args: { revnetId: COBUILD_PROJECT_IDS } },
            { event: "Liquidate", args: { revnetId: COBUILD_PROJECT_IDS } },
            {
              event: "ReallocateCollateral",
              args: { revnetId: COBUILD_PROJECT_IDS },
            },
            { event: "RepayLoan", args: { revnetId: COBUILD_PROJECT_IDS } },
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
      abi: BudgetTCRFactoryProtocolEventsAbi,
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
    BudgetTCRProtocolEvents: {
      abi: BudgetTCRProtocolEventsAbi,
      chain: "base",
      address: factory({
        address: ENTRYPOINTS.BUDGET_TCR_FACTORY,
        event: BUDGET_TCR_STACK_DEPLOYED_FOR_GOAL,
        parameter: "budgetTCR",
      }),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    ERC20VotesArbitrator: {
      abi: ERC20VotesArbitratorAbi,
      chain: "base",
      address: goalFactoryStackAddress("stack.arbitrator"),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    AllocationMechanismTCR: {
      abi: AllocationMechanismTCRAbi,
      chain: "base",
      address: factory({
        address: ENTRYPOINTS.BUDGET_TCR_FACTORY,
        event: BUDGET_ALLOCATION_MECHANISM_DEPLOYED_FROM_FACTORY,
        parameter: "allocationMechanism",
      }),
      startBlock: SCAFFOLD_START_BLOCK,
    },
    MechanismERC20VotesArbitrator: {
      abi: ERC20VotesArbitratorAbi,
      chain: "base",
      address: factory({
        address: ENTRYPOINTS.BUDGET_TCR_FACTORY,
        event: BUDGET_ALLOCATION_MECHANISM_DEPLOYED_FROM_FACTORY,
        parameter: "allocationMechanismArbitrator",
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
