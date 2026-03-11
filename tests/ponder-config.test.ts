import { describe, expect, it, vi } from "vitest";
import { COBUILD_PROJECT_ID_BIGINT, COBUILD_TOKEN_ADDRESS } from "@cobuild/wire";

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
  args: Record<string, readonly bigint[] | bigint[] | undefined>;
};

const expectProjectFilters = (
  filters: readonly Filter[],
  eventNames: readonly string[],
  argumentKey: "projectId" | "revnetId"
) => {
  const expectedProjectIds = [COBUILD_PROJECT_ID_BIGINT];
  const filteredEvents = filters.filter((filter) => eventNames.includes(filter.event));

  expect(filteredEvents).toHaveLength(eventNames.length);
  expect(filteredEvents.map((filter) => filter.event)).toEqual(eventNames);

  for (const filter of filteredEvents) {
    expect(filter.args[argumentKey]).toEqual(expectedProjectIds);
  }
};

describe("ponder config cobuild filters", () => {
  it("pins all canonical project and revnet filters to the wire-sourced cobuild project id", () => {
    expectProjectFilters(
      ponderConfig.contracts.REVDeployer.chain.base.filter,
      ["DeployRevnet"],
      "revnetId"
    );
    expectProjectFilters(
      ponderConfig.contracts.JBTokens.chain.base.filter,
      ["DeployERC20", "Mint", "Burn"],
      "projectId"
    );
    expectProjectFilters(
      ponderConfig.contracts.JBController.chain.base.filter,
      ["MintTokens", "SendReservedTokensToSplits", "SetUri"],
      "projectId"
    );
    expectProjectFilters(
      ponderConfig.contracts.JBMultiTerminal.chain.base.filter,
      [
        "AddToBalance",
        "CashOutTokens",
        "Pay",
        "SendPayouts",
        "SetAccountingContext",
        "UseAllowance",
      ],
      "projectId"
    );
    expectProjectFilters(
      ponderConfig.contracts.JBRulesets.chain.base.filter,
      ["RulesetQueued", "RulesetInitialized"],
      "projectId"
    );
    expectProjectFilters(
      ponderConfig.contracts.RevLoans.chain.base.filter,
      ["Borrow", "Liquidate", "ReallocateCollateral", "RepayLoan"],
      "revnetId"
    );
  });

  it("tracks the canonical cobuild token address for ERC20 transfers", () => {
    expect(ponderConfig.contracts.ERC20.address).toEqual([COBUILD_TOKEN_ADDRESS]);
  });
});
