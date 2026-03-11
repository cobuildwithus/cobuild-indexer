import { describe, expect, it, vi } from "vitest";
import { COBUILD_TOKEN_ADDRESS, baseEntrypoints } from "@cobuild/wire";

vi.mock("ponder", () => ({
  createConfig: <T>(config: T) => config,
  factory: (config: unknown) => config,
}));

vi.mock("../src/lib/config", () => ({
  config: {
    RevDeployer: { base: { startBlock: 1 } },
    JBTokens: { base: { startBlock: 1 } },
    JBProjects: { base: { startBlock: 1 } },
    JBController: { base: { startBlock: 1 } },
    ERC20: { base: { startBlock: 1 } },
    JBMultiTerminal: { base: { startBlock: 1 } },
    JBRulesets: { base: { startBlock: 1 } },
    RevLoans: { base: { startBlock: 1 } },
    JBSuckerRegistry: { base: { startBlock: 1 } },
  },
  getChainsAndRpcUrls: () => ({
    base: {
      id: 8453,
      rpc: "mock-rpc",
      ws: "mock-ws",
    },
  }),
  IndexerConfig: {
    CobuildSwap: {
      base: {
        startBlock: 1,
      },
    },
  },
}));

const ponderConfig = (await import("../ponder.config")).default;

type Filter = {
  event: string;
  args: Record<string, unknown>;
};

const expectBroadFilters = (
  filters: readonly Filter[],
  eventNames: readonly string[]
) => {
  const filteredEvents = filters.filter((filter) => eventNames.includes(filter.event));

  expect(filteredEvents).toHaveLength(eventNames.length);
  expect(filteredEvents.map((filter) => filter.event)).toEqual(eventNames);

  for (const filter of filteredEvents) {
    expect(filter.args).toEqual({});
  }
};

describe("ponder config scope", () => {
  it("broadens shared REV and Juicebox contract filters while preserving explicit event lists", () => {
    expectBroadFilters(
      ponderConfig.contracts.REVDeployer.chain.base.filter,
      ["DeployRevnet"]
    );
    expectBroadFilters(
      ponderConfig.contracts.JBTokens.chain.base.filter,
      ["DeployERC20", "Mint", "Burn"]
    );
    expectBroadFilters(
      ponderConfig.contracts.JBController.chain.base.filter,
      ["LaunchProject", "MintTokens", "SendReservedTokensToSplits", "SetUri"]
    );
    expectBroadFilters(
      ponderConfig.contracts.JBMultiTerminal.chain.base.filter,
      [
        "AddToBalance",
        "CashOutTokens",
        "Pay",
        "SendPayouts",
        "SetAccountingContext",
        "UseAllowance",
      ]
    );
    expectBroadFilters(
      ponderConfig.contracts.JBRulesets.chain.base.filter,
      ["RulesetQueued", "RulesetInitialized"]
    );
    expectBroadFilters(
      ponderConfig.contracts.RevLoans.chain.base.filter,
      ["Borrow", "Liquidate", "ReallocateCollateral", "RepayLoan", "Transfer"]
    );
  });

  it("tracks the canonical root token address for ERC20 transfers", () => {
    expect(ponderConfig.contracts.ERC20.address).toEqual([COBUILD_TOKEN_ADDRESS]);
  });

  it("discovers goal token transfer contracts from GoalFactory deployments", () => {
    expect(ponderConfig.contracts.GoalToken).toMatchObject({
      abi: expect.any(Array),
      chain: "base",
      startBlock: 42_941_210,
      address: {
        address: baseEntrypoints.goalFactory,
        parameter: "stack.goalToken",
      },
    });
  });
});
