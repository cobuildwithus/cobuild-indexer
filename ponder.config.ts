import { createConfig, factory } from "ponder";
import { config, getChainsAndRpcUrls, IndexerConfig } from "./src/lib/config";
import { cobuildSwapImplAbi } from "./abis";
import { contracts } from "./addresses";
import { erc20Abi, getAbiItem } from "viem";
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

export default createConfig({
  ordering: "omnichain",
  chains: getChainsAndRpcUrls(),
  contracts: {
    REVDeployer: {
      chain: config.RevDeployer,
      abi: revDeployerAbi,
      address: contracts.REVDeployer,
    },
    JBTokens: {
      chain: config.JBTokens,
      abi: jbTokensAbi,
      address: contracts.JBTokens,
    },
    JBProjects: {
      chain: config.JBProjects,
      abi: jbProjectsAbi,
      address: contracts.JBProjects,
    },
    JBController: {
      chain: config.JBController,
      abi: jbControllerAbi,
      address: contracts.JBController,
    },
    ERC20: {
      abi: erc20Abi,
      address: factory({
        address: contracts.JBTokens,
        event: getAbiItem({ abi: jbTokensAbi, name: "DeployERC20" }),
        parameter: "token",
      }),
      chain: config.ERC20,
    },
    JBMultiTerminal: {
      chain: config.JBMultiTerminal,
      abi: jbMultiTerminalAbi,
      address: contracts.JBMultiTerminal,
    },
    JBRulesets: {
      chain: config.JBRulesets,
      abi: jbRulesetsAbi,
      address: contracts.JBRulesets,
    },
    RevLoans: {
      chain: config.RevLoans,
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
  },
  blocks: {
    CheckRulesetBase: {
      chain: "base",
      startBlock: "latest",
      interval: 600 / 2, // Every 10 minutes (base block time is 2s)
    },
  },
});
