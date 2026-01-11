import { createConfig } from "ponder";
import { config, getChainsAndRpcUrls, IndexerConfig } from "./src/lib/config";
import { cobuildSwapImplAbi } from "./abis";
import { contracts } from "./addresses";
import { erc20Abi } from "viem";
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
const BASE_TOKEN_ALLOWLIST = [
  "0x794FDDbe0609CD704d7920eB3f950a57D4661193",
] as const;

export default createConfig({
  ordering: "omnichain",
  chains: getChainsAndRpcUrls(),
  contracts: {
    REVDeployer: {
      chain: {
        ...config.RevDeployer,
        base: {
          ...config.RevDeployer.base,
          filter: [{ event: "DeployRevnet", args: { revnetId: BASE_PROJECT_IDS } }],
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
      address: BASE_TOKEN_ALLOWLIST,
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
      address: BASE_TOKEN_ALLOWLIST,
      filter: {
        event: "Transfer",
        args: { from: contracts.CobuildSwap },
      },
      chain: "base",
      startBlock: IndexerConfig.CobuildSwap.base.startBlock,
    },
  },
  blocks: {
    CheckRulesetBase: {
      chain: "base",
      startBlock: "latest",
      interval: 600 / 2, // Every 10 minutes (base block time is 2s)
    },
  },
});
