import { readFileSync } from "fs";
import { resolve } from "path";

import { evaluatePreflight, quantityCost } from "./preflight";
import {
  CheckFlagReturn,
  CreditBalances,
  CreditSpendPolicy,
  RuleType,
} from "./types";

type QuantityCostCase = {
  name: string;
  consumption_rate: number;
  quantity_rates?: Record<string, number>;
  quantity?: number;
  quantities?: Record<string, number>;
  expected_cost: number;
};

// Copied from schematic-api api/lib/rulesengine/testdata/quantity_cost.json.
const fixture = JSON.parse(
  readFileSync(resolve(__dirname, "__fixtures__/quantity_cost.json"), "utf8"),
) as { cases: QuantityCostCase[] };

describe("quantityCost", () => {
  it.each(fixture.cases.map((c) => [c.name, c] as const))(
    "prices %s like the burn",
    (_name, c) => {
      const base = c.quantity !== undefined && c.quantity > 0 ? c.quantity : 1;
      const cost = quantityCost(
        c.consumption_rate,
        c.quantity_rates ?? {},
        base,
        c.quantities ?? {},
      );
      expect(Math.abs(cost - c.expected_cost)).toBeLessThanOrEqual(1e-9);
    },
  );

  it("ignores a rated key named after an Object prototype member", () => {
    expect(quantityCost(2, { constructor: 5, toString: 3 }, 1, {})).toBe(2);
  });
});

const creditResult = (
  overrides: Partial<CheckFlagReturn> = {},
): CheckFlagReturn => ({
  flag: "ai-chat",
  reason: "Matched plan entitlement rule",
  ruleType: RuleType.PLAN_ENTITLEMENT,
  value: true,
  creditId: "cred_1",
  creditRemaining: 10,
  consumptionRate: 2,
  eventSubtype: "chat",
  quantityRates: { input_tokens: 0.01, output_tokens: 0.1 },
  ...overrides,
});

const balances = (
  overrides: Partial<CreditBalances[string]> = {},
): CreditBalances => ({
  cred_1: {
    remaining: 10,
    reserved: 0,
    settled: 10,
    postpaid: false,
    ...overrides,
  },
});

const policy = (overrides: Partial<CreditSpendPolicy>): CreditSpendPolicy => ({
  id: "csp_1",
  creditId: "cred_1",
  kind: "per_draw",
  scope: "company",
  limit: 100,
  consumed: 0,
  ...overrides,
});

describe("evaluatePreflight", () => {
  describe("gate", () => {
    it("defers to the server for a standard rule", () => {
      expect(
        evaluatePreflight(
          creditResult({ ruleType: RuleType.STANDARD }),
          balances(),
          [],
          { usage: 1 },
        ),
      ).toBeUndefined();
    });

    it("defers to the server for global override, default and no rule type", () => {
      for (const ruleType of [
        RuleType.GLOBAL_OVERRIDE,
        RuleType.DEFAULT,
        undefined,
      ]) {
        expect(
          evaluatePreflight(creditResult({ ruleType }), balances(), [], {
            usage: 1,
          }),
        ).toBeUndefined();
      }
    });

    it("defers to the server with no cached result", () => {
      expect(
        evaluatePreflight(undefined, balances(), [], { usage: 1 }),
      ).toBeUndefined();
    });

    it("returns false when a company-scoped rule turned the flag off", () => {
      expect(
        evaluatePreflight(
          creditResult({
            ruleType: RuleType.COMPANY_OVERRIDE,
            value: false,
          }),
          balances(),
          [],
          { creditCost: { cred_1: 0 } },
        ),
      ).toBe(false);
    });

    it("returns the cached value for a boolean entitlement", () => {
      const result: CheckFlagReturn = {
        flag: "export",
        reason: "Matched",
        ruleType: RuleType.PLAN_ENTITLEMENT,
        value: true,
      };
      expect(
        evaluatePreflight(result, undefined, undefined, { usage: 5 }),
      ).toBe(true);
    });

    it("defers to the server on input it would reject", () => {
      expect(
        evaluatePreflight(creditResult(), balances(), [], { usage: -1 }),
      ).toBeUndefined();
      expect(
        evaluatePreflight(creditResult(), balances(), [], {
          creditCost: { cred_1: -1 },
        }),
      ).toBeUndefined();
    });
  });

  describe("local denies", () => {
    it("defers when another rule could grant on a different credit", () => {
      // The base plan's credit is spent, but an add-on may grant the same
      // feature on cred_2, which the cached result does not mention.
      expect(
        evaluatePreflight(
          creditResult({ creditRemaining: 0 }),
          {
            ...balances(),
            cred_2: {
              remaining: 100,
              reserved: 0,
              settled: 100,
              postpaid: false,
            },
          },
          [],
          { usage: 1 },
        ),
      ).toBeUndefined();
    });

    it("defers when an override is tighter than the plan", () => {
      const override: CheckFlagReturn = {
        flag: "api-calls",
        reason: "Matched company override rule",
        ruleType: RuleType.COMPANY_OVERRIDE,
        value: true,
        eventSubtype: "api-call",
        featureUsageEvent: "api-call",
        featureAllocation: 5,
        featureUsage: 4,
      };
      // The plan may allow 10, which the cached override result cannot show.
      expect(
        evaluatePreflight(override, undefined, undefined, { usage: 2 }),
      ).toBeUndefined();
      expect(
        evaluatePreflight(override, undefined, undefined, { usage: 0 }),
      ).toBe(true);
    });

    it("defers on an exceeded entitlement with no entitlement fields", () => {
      const exceeded: CheckFlagReturn = {
        flag: "ai-chat",
        reason: "Usage exceeded",
        ruleType: RuleType.PLAN_ENTITLEMENT_USAGE_EXCEEDED,
        value: false,
      };
      expect(
        evaluatePreflight(exceeded, balances(), [], { creditCost: { c: 0 } }),
      ).toBeUndefined();
    });

    it("defers when the balance does not say whether it is postpaid", () => {
      const unknown: CreditBalances = {
        cred_1: { remaining: 10, reserved: 0, settled: 10 },
      };
      expect(
        evaluatePreflight(creditResult(), unknown, [], { usage: 1 }),
      ).toBeUndefined();
    });
  });

  describe("credit draw precedence", () => {
    // remaining 10, consumption rate 2, so at most 5 units
    it("prefers credit_cost over everything else", () => {
      const input = {
        creditCost: { cred_1: 10 },
        eventQuantities: { eventSubtype: "chat", quantity: 100 },
        eventUsage: { eventSubtype: "chat", quantity: 100 },
        usage: 100,
      };
      expect(evaluatePreflight(creditResult(), balances(), [], input)).toBe(
        true,
      );
      input.creditCost.cred_1 = 10.5;
      expect(
        evaluatePreflight(creditResult(), balances(), [], input),
      ).toBeUndefined();
    });

    it("prices event_quantities ahead of event_usage and usage", () => {
      // 1 request at 2, 400 input at 0.01, 40 output at 0.1 = 10
      const input = {
        eventQuantities: {
          eventSubtype: "chat",
          quantities: { input_tokens: 400, output_tokens: 40 },
        },
        eventUsage: { eventSubtype: "chat", quantity: 100 },
        usage: 100,
      };
      expect(evaluatePreflight(creditResult(), balances(), [], input)).toBe(
        true,
      );
      input.eventQuantities.quantities.output_tokens = 41;
      expect(
        evaluatePreflight(creditResult(), balances(), [], input),
      ).toBeUndefined();
    });

    it("skips event_quantities for another subtype", () => {
      expect(
        evaluatePreflight(creditResult(), balances(), [], {
          eventQuantities: { eventSubtype: "image", quantity: 100 },
          usage: 5,
        }),
      ).toBe(true);
    });

    it("prices a matching event_usage ahead of usage", () => {
      expect(
        evaluatePreflight(creditResult(), balances(), [], {
          eventUsage: { eventSubtype: "chat", quantity: 6 },
          usage: 1,
        }),
      ).toBeUndefined();
      expect(
        evaluatePreflight(creditResult(), balances(), [], {
          eventUsage: { eventSubtype: "image", quantity: 6 },
          usage: 5,
        }),
      ).toBe(true);
    });

    it("prices usage at the consumption rate", () => {
      expect(
        evaluatePreflight(creditResult(), balances(), [], { usage: 5 }),
      ).toBe(true);
      expect(
        evaluatePreflight(creditResult(), balances(), [], { usage: 6 }),
      ).toBeUndefined();
    });

    it("falls back to a single unit at the consumption rate", () => {
      expect(
        evaluatePreflight(
          creditResult({ creditRemaining: 2 }),
          balances(),
          [],
          { usage: 0 },
        ),
      ).toBe(true);
      expect(
        evaluatePreflight(
          creditResult({ creditRemaining: 1.5 }),
          balances(),
          [],
          {},
        ),
      ).toBeUndefined();
    });

    it("matches the usage-exceeded twin when the draw is covered", () => {
      expect(
        evaluatePreflight(
          creditResult({
            ruleType: RuleType.PLAN_ENTITLEMENT_USAGE_EXCEEDED,
            value: false,
            creditRemaining: 0,
          }),
          balances(),
          [],
          { creditCost: { cred_1: 0 } },
        ),
      ).toBe(true);
    });
  });

  describe("zero cost", () => {
    const free = creditResult({
      consumptionRate: 0,
      quantityRates: { input_tokens: 0.01 },
      creditRemaining: 0,
    });

    it("needs headroom when priced from the rates", () => {
      const input = {
        eventQuantities: { eventSubtype: "chat", quantities: {} },
      };
      expect(evaluatePreflight(free, balances(), [], input)).toBeUndefined();
      expect(
        evaluatePreflight(
          { ...free, creditRemaining: 0.001 },
          balances(),
          [],
          input,
        ),
      ).toBe(true);
    });

    it("passes at zero balance for an explicit zero credit_cost", () => {
      expect(
        evaluatePreflight(free, balances(), [], { creditCost: { cred_1: 0 } }),
      ).toBe(true);
    });
  });

  describe("postpaid", () => {
    it("covers any cost with no overdraft limit", () => {
      expect(
        evaluatePreflight(
          creditResult({ creditRemaining: -500 }),
          balances({ postpaid: true }),
          [],
          { usage: 1000 },
        ),
      ).toBe(true);
    });

    it("measures the cost against the overdraft floor", () => {
      const result = creditResult({ creditRemaining: -95 });
      const postpaid = balances({ postpaid: true, overdraftLimit: 100 });
      expect(
        evaluatePreflight(result, postpaid, [], { creditCost: { cred_1: 5 } }),
      ).toBe(true);
      expect(
        evaluatePreflight(result, postpaid, [], { creditCost: { cred_1: 6 } }),
      ).toBeUndefined();
    });

    it("ignores an overdraft limit on a credit that is not postpaid", () => {
      expect(
        evaluatePreflight(
          creditResult({ creditRemaining: 0 }),
          balances({ postpaid: false, overdraftLimit: 100 }),
          [],
          { creditCost: { cred_1: 1 } },
        ),
      ).toBeUndefined();
    });
  });

  describe("spend policies", () => {
    it("refuses a draw above a per_draw limit", () => {
      const policies = [policy({ kind: "per_draw", limit: 4 })];
      expect(
        evaluatePreflight(creditResult(), balances(), policies, { usage: 2 }),
      ).toBe(true);
      expect(
        evaluatePreflight(creditResult(), balances(), policies, { usage: 3 }),
      ).toBeUndefined();
    });

    it("refuses a draw that would overrun a window", () => {
      const now = new Date("2026-10-15T12:00:00Z");
      const window = policy({
        kind: "window",
        limit: 10,
        consumed: 7,
        resetsAt: new Date("2026-10-16T00:00:00Z"),
      });
      expect(
        evaluatePreflight(
          creditResult(),
          balances(),
          [window],
          { usage: 1 },
          now,
        ),
      ).toBe(true);
      expect(
        evaluatePreflight(
          creditResult(),
          balances(),
          [window],
          { usage: 2 },
          now,
        ),
      ).toBeUndefined();
      // a window that has already reset no longer counts its consumption
      expect(
        evaluatePreflight(
          creditResult(),
          balances(),
          [{ ...window, resetsAt: new Date("2026-10-15T00:00:00Z") }],
          { usage: 2 },
          now,
        ),
      ).toBe(true);
    });

    it("refuses even when postpaid would cover the draw", () => {
      expect(
        evaluatePreflight(
          creditResult(),
          balances({ postpaid: true }),
          [policy({ limit: 1 })],
          { usage: 1 },
        ),
      ).toBeUndefined();
    });

    it("ignores policies on other credits and unknown kinds", () => {
      expect(
        evaluatePreflight(
          creditResult(),
          balances(),
          [
            policy({ creditId: "cred_2", limit: 0 }),
            policy({ kind: "group_window", limit: 0 }),
          ],
          { usage: 1 },
        ),
      ).toBe(true);
    });
  });

  describe("metric condition", () => {
    const metric = (overrides: Partial<CheckFlagReturn> = {}) =>
      ({
        flag: "api-calls",
        reason: "Matched plan entitlement rule",
        ruleType: RuleType.PLAN_ENTITLEMENT,
        value: true,
        eventSubtype: "api-call",
        featureUsageEvent: "api-call",
        featureAllocation: 10,
        featureUsage: 7,
        ...overrides,
      }) as CheckFlagReturn;

    it("adds a matching event_usage to the usage", () => {
      expect(
        evaluatePreflight(metric(), undefined, undefined, {
          eventUsage: { eventSubtype: "api-call", quantity: 2 },
          usage: 100,
        }),
      ).toBe(true);
      expect(
        evaluatePreflight(metric(), undefined, undefined, {
          eventUsage: { eventSubtype: "api-call", quantity: 3 },
        }),
      ).toBeUndefined();
    });

    it("falls back to usage when event_usage names another subtype", () => {
      expect(
        evaluatePreflight(metric(), undefined, undefined, {
          eventUsage: { eventSubtype: "export", quantity: 100 },
          usage: 2,
        }),
      ).toBe(true);
      expect(
        evaluatePreflight(metric(), undefined, undefined, {
          eventUsage: { eventSubtype: "export", quantity: 100 },
        }),
      ).toBe(true);
    });

    it("adds plain usage", () => {
      expect(
        evaluatePreflight(metric(), undefined, undefined, { usage: 2 }),
      ).toBe(true);
      expect(
        evaluatePreflight(metric(), undefined, undefined, { usage: 3 }),
      ).toBeUndefined();
    });

    it("defers to the server when an exceeded limit stays exceeded", () => {
      expect(
        evaluatePreflight(
          metric({
            ruleType: RuleType.PLAN_ENTITLEMENT_USAGE_EXCEEDED,
            value: false,
            featureUsage: 10,
          }),
          undefined,
          undefined,
          { usage: 1 },
        ),
      ).toBeUndefined();
    });

    it("defers to the server for a trait condition with usage", () => {
      expect(
        evaluatePreflight(
          metric({ eventSubtype: undefined, featureUsageEvent: undefined }),
          undefined,
          undefined,
          { usage: 1 },
        ),
      ).toBeUndefined();
    });
  });
});
