import { describe, expect, it, vi } from "vitest";
import { BASE_SCAFFOLD_START_BLOCK, COBUILD_TOKEN_ADDRESS } from "@cobuild/wire";

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
  const bridgedGoalFactory = "0xA8a7d64D4bb1Fe9B73F69336a607979CB24B771E";
  const bridgedBudgetTcrFactory = "0x39E473250eD0cb7b8BF41faeea9f7BdDb97A1d57";

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
      startBlock: BASE_SCAFFOLD_START_BLOCK,
      address: {
        address: bridgedGoalFactory,
        parameter: "stack.goalToken",
      },
    });
  });

  it("uses the published wire GoalFactory contract with the rerun GoalDeployed event shape", () => {
    expect(ponderConfig.contracts.GoalFactory).toMatchObject({
      chain: "base",
      address: bridgedGoalFactory,
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    });

    const goalDeployedEvent = ponderConfig.contracts.GoalFactory.abi.find(
      (entry: { type: string; name?: string }) =>
        entry.type === "event" && entry.name === "GoalDeployed"
    );

    expect(goalDeployedEvent).toBeDefined();
    expect(goalDeployedEvent).toMatchObject({
      inputs: [
        expect.objectContaining({ name: "caller" }),
        expect.objectContaining({ name: "goalRevnetId" }),
        expect.objectContaining({
          name: "stack",
          components: expect.arrayContaining([
            expect.objectContaining({ name: "goalAllocatorStrategy" }),
            expect.objectContaining({ name: "budgetController" }),
          ]),
        }),
      ],
    });
  });

  it("uses the published wire BudgetTCRFactory discovery address for the rerun deployment", () => {
    expect(ponderConfig.contracts.BudgetTCRFactory).toMatchObject({
      abi: expect.any(Array),
      chain: "base",
      address: bridgedBudgetTcrFactory,
      startBlock: BASE_SCAFFOLD_START_BLOCK,
    });
  });
});
