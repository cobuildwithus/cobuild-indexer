import { base } from "viem/chains";
import { getRpcTransport, getWsUrl } from "./rpc-transport";

export const config = {
  RevDeployer: {
    base: {
      startBlock: 26521040,
    },
  },
  JBTokens: {
    base: {
      startBlock: 26485001,
    },
  },
  JBProjects: {
    base: {
      startBlock: 26484953,
    },
  },
  JBController: {
    base: {
      startBlock: 26485017,
    },
  },
  ERC20: {
    base: {
      startBlock: 26485001,
    },
  },
  JBMultiTerminal: {
    base: {
      startBlock: 26485049,
    },
  },
  JBRulesets: {
    base: {
      startBlock: 26484977,
    },
  },
  RevLoans: {
    base: {
      startBlock: 26521046,
    },
  },
  JBSuckerRegistry: {
    base: {
      startBlock: 26487986,
    },
  },
};

export const getChainsAndRpcUrls = () => {
  return {
    base: {
      id: base.id,
      rpc: getRpcTransport("base"),
      ws: getWsUrl("base"),
    },
  };
};

export const IndexerConfig = {
  CobuildSwap: {
    base: {
      startBlock: 34243938,
    },
  },
} as const;
