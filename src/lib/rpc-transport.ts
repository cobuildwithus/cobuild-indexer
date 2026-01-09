import { fallback, http } from "viem";

type Chain = "base" | "eth" | "optimism";

type HttpTransport = ReturnType<typeof http>;

const defined = <T>(value: T | undefined | null): value is T => !!value;

function assertAtLeastTwo<T>(items: T[]): asserts items is [T, T, ...T[]] {
  if (items.length < 2) {
    throw new Error("Expected at least two transports.");
  }
}

function getPrefix(chain: Chain): string {
  switch (chain) {
    case "base":
      return "base-mainnet";
    case "eth":
      return "mainnet";
    case "optimism":
      return "optimism-mainnet";
    default:
      throw new Error(`Unknown chain: ${chain}`);
  }
}

const buildHttpTransports = (chain: Chain): HttpTransport[] => {
  const prefix = getPrefix(chain);
  const httpUrls = [
    process.env.INFURA_API_KEY &&
      `https://${prefix}.infura.io/v3/${process.env.INFURA_API_KEY}`,
    process.env.DWELLIR_API_KEY &&
      `https://api-${prefix}.n.dwellir.com/${process.env.DWELLIR_API_KEY}`,
    process.env.ALCHEMY_KEY_COBUILD_INDEXER &&
      `https://${prefix}.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_COBUILD_INDEXER}`,
    process.env.CHAINSTACK_API_KEY &&
      `https://${prefix}.core.chainstack.com/${process.env.CHAINSTACK_API_KEY}`,
  ].filter(defined);

  if (httpUrls.length === 0) {
    throw new Error(`At least one HTTP RPC URL must be configured for ${chain}.`);
  }

  return httpUrls.map((url) => http(url));
};

const selectWsUrl = (chain: Chain): string | undefined => {
  const prefix = getPrefix(chain);
  const wsUrls = [
    process.env.DWELLIR_API_KEY &&
      `wss://api-${prefix}.n.dwellir.com/${process.env.DWELLIR_API_KEY}`,
    process.env.ALCHEMY_KEY_COBUILD_INDEXER &&
      `wss://${prefix}.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_COBUILD_INDEXER}`,
    process.env.INFURA_API_KEY &&
      `wss://${prefix}.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
    process.env.CHAINSTACK_API_KEY &&
      `wss://${prefix}.core.chainstack.com/ws/${process.env.CHAINSTACK_API_KEY}`,
  ].filter(defined);

  return wsUrls[0];
};

export const getRpcTransport = (chain: Chain) => {
  const httpTransports = buildHttpTransports(chain);
  if (httpTransports.length === 1) {
    return httpTransports[0];
  }

  assertAtLeastTwo(httpTransports);
  return fallback(
    httpTransports as readonly [HttpTransport, HttpTransport, ...HttpTransport[]]
  );
};

export const getWsUrl = (chain: Chain) => selectWsUrl(chain);
