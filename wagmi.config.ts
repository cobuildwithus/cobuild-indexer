import { defineConfig, loadEnv } from "@wagmi/cli";
import { etherscan } from "@wagmi/cli/plugins";
import { contracts } from "./addresses.cobuild";

export default defineConfig(() => {
  const env = loadEnv({ mode: process.env.NODE_ENV, envDir: process.cwd() });
  const basescanApiKey = env.BASESCAN_API_KEY;

  if (!basescanApiKey) {
    throw new Error("BASESCAN_API_KEY is required to generate ABIs.");
  }

  return {
    out: "abis.ts",
    contracts: [],
    plugins: [
      etherscan({
        apiKey: basescanApiKey,
        chainId: 8453,
        contracts: [
          { name: "CobuildSwapImpl", address: contracts.CobuildSwapImpl },
        ],
      }),
    ],
  };
});
