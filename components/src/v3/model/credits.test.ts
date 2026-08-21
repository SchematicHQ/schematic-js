import type { CreditGrantReason } from "@schematichq/schematic-react";

import {
  catalog,
  creditBalance,
  creditBundle,
  creditGrantRow,
  creditRef,
  daysFromNow,
  oneTime,
} from "../fixtures/builders";

import {
  bundleCompatible,
  deriveCreditBalances,
  type LedgerKind,
} from "./credits";
import { formatDate } from "./format";

const L = "en-US";

const aiCredits = () => ({
  ...creditRef({
    id: "credit_ai",
    name: "AI credits",
    singularName: "AI credit",
    pluralName: "AI credits",
  }),
  description: "",
});

describe("deriveCreditBalances ledger", () => {
  test.each<[CreditGrantReason, LedgerKind]>([
    ["plan", "plan"],
    ["purchased", "purchased"],
    ["billing_credit_auto_topup", "auto_topup"],
    ["free", "promotional"],
    ["adjustment", "other"],
    ["rollover", "other"],
  ])("maps reason %s to ledger kind %s", (reason, kind) => {
    const [summary] = deriveCreditBalances(
      [creditBalance({ grants: [creditGrantRow({ reason })] })],
      { locale: L },
    );
    expect(summary.ledger[0].kind).toBe(kind);
  });

  test("orders rows newest first regardless of server order", () => {
    const [summary] = deriveCreditBalances(
      [
        creditBalance({
          grants: [
            creditGrantRow({ id: "old", createdAt: daysFromNow(-30) }),
            creditGrantRow({ id: "new", createdAt: daysFromNow(-1) }),
            creditGrantRow({ id: "mid", createdAt: daysFromNow(-10) }),
          ],
        }),
      ],
      { locale: L },
    );
    expect(summary.ledger.map((row) => row.id)).toEqual(["new", "mid", "old"]);
  });

  test("formats quantities, units, and short dates per row", () => {
    const [summary] = deriveCreditBalances(
      [
        creditBalance({
          credit: aiCredits(),
          grants: [
            creditGrantRow({
              reason: "purchased",
              plan: null,
              bundle: { id: "b", name: "Pack" },
              quantity: 2000,
              renewalPeriod: null,
              createdAt: daysFromNow(-3),
              expiresAt: daysFromNow(90),
            }),
          ],
        }),
      ],
      { locale: L },
    );
    expect(summary.ledger[0]).toMatchObject({
      quantityText: "2,000",
      unit: "AI credits",
      sourceName: "Pack",
      createdAtText: formatDate(daysFromNow(-3), L, { month: "short" }),
      resetsAt: null,
      expiresAt: {
        text: formatDate(daysFromNow(90), L, { month: "short" }),
      },
    });
  });

  test.each([
    ["a renewing plan grant resets", "plan", "monthly", "resetsAt"],
    ["a non-renewing plan grant expires", "plan", null, "expiresAt"],
    ["a purchased grant expires", "purchased", null, "expiresAt"],
  ] as const)("%s", (_label, reason, renewalPeriod, field) => {
    const [summary] = deriveCreditBalances(
      [
        creditBalance({
          grants: [
            creditGrantRow({
              reason,
              renewalPeriod,
              expiresAt: daysFromNow(20),
            }),
          ],
        }),
      ],
      { locale: L },
    );
    const row = summary.ledger[0];
    expect(row[field]).not.toBeNull();
    expect(row[field === "resetsAt" ? "expiresAt" : "resetsAt"]).toBeNull();
  });
});

describe("deriveCreditBalances meter", () => {
  test.each([
    ["under the warning", 1000, 120, 880, "ok", 12],
    ["at the warning", 1000, 900, 100, "warning", 90],
    ["exhausted", 1000, 1000, 0, "over", 100],
    ["nothing granted", 0, 0, 0, "ok", null],
  ])("%s", (_label, total, used, remaining, state, percent) => {
    const [summary] = deriveCreditBalances(
      [creditBalance({ grants: [], total, used, remaining })],
      { locale: L },
    );
    expect(summary.state).toBe(state);
    expect(summary.percentUsed).toBe(percent);
  });

  test("honours a custom warning percent", () => {
    const [summary] = deriveCreditBalances(
      [creditBalance({ grants: [], total: 100, used: 50, remaining: 50 })],
      { locale: L, warningPercent: 50 },
    );
    expect(summary.state).toBe("warning");
  });

  test("formats the totals and the balance expiry", () => {
    const [summary] = deriveCreditBalances(
      [
        creditBalance({
          credit: aiCredits(),
          grants: [],
          total: 1000,
          used: 120,
          remaining: 880,
          expiresAt: daysFromNow(20),
        }),
      ],
      { locale: L },
    );
    expect(summary).toMatchObject({
      totalText: "1,000",
      usedText: "120",
      remainingText: "880",
      unit: "AI credits",
      expiresAt: { text: formatDate(daysFromNow(20), L) },
    });
  });
});

describe("bundleCompatible", () => {
  test.each([
    ["any plan, no plan held", null, null, true],
    ["any plan, a plan held", null, "plan_pro", true],
    ["listed plan held", ["plan_pro"], "plan_pro", true],
    ["unlisted plan held", ["plan_pro"], "plan_free", false],
    ["listed plans, none held", ["plan_pro"], null, false],
    ["listed plans, plan unknown", ["plan_pro"], undefined, false],
  ])("%s", (_label, compatiblePlanIds, planId, expected) => {
    expect(bundleCompatible({ compatiblePlanIds }, planId)).toBe(expected);
  });
});

describe("deriveCreditBalances bundles", () => {
  const balances = () => [creditBalance({ credit: aiCredits(), grants: [] })];
  const bundles = () => [
    creditBundle({
      id: "b_any",
      name: "500 AI credits",
      credit: aiCredits(),
      quantity: 500,
      prices: [oneTime(2500), oneTime(2000, "eur")],
    }),
    creditBundle({
      id: "b_pro",
      name: "Pro pack",
      credit: aiCredits(),
      compatiblePlanIds: ["plan_pro"],
    }),
    creditBundle({
      id: "b_other",
      credit: creditRef({ id: "credit_other" }),
    }),
  ];

  test("offers the credit's bundles compatible with the current plan", () => {
    const [summary] = deriveCreditBalances(balances(), {
      locale: L,
      catalog: catalog({ creditBundles: bundles() }),
      currentPlanId: "plan_pro",
    });
    expect(summary.bundles.map((b) => b.id)).toEqual(["b_any", "b_pro"]);
    expect(summary.bundles[0]).toMatchObject({
      name: "500 AI credits",
      quantityText: "500",
      priceText: "$25.00",
      isPerCredit: false,
      unit: "AI credit",
    });
    expect(summary.canBuyMore).toBe(true);
  });

  test("drops plan-gated bundles off the plan", () => {
    const [summary] = deriveCreditBalances(balances(), {
      locale: L,
      catalog: catalog({ creditBundles: bundles() }),
      currentPlanId: "plan_free",
    });
    expect(summary.bundles.map((b) => b.id)).toEqual(["b_any"]);
  });

  test.each([
    ["checkout is off", { checkout: false }, bundles(), "plan_pro", false],
    ["no bundle matches", { checkout: true }, [], "plan_pro", false],
    ["bundles and checkout", { checkout: true }, bundles(), "plan_pro", true],
  ])(
    "canBuyMore when %s",
    (_label, capabilities, creditBundles, currentPlanId, expected) => {
      const [summary] = deriveCreditBalances(balances(), {
        locale: L,
        catalog: catalog({ capabilities, creditBundles }),
        currentPlanId,
      });
      expect(summary.canBuyMore).toBe(expected);
    },
  );

  test("cannot buy more without a catalog", () => {
    const [summary] = deriveCreditBalances(balances(), { locale: L });
    expect(summary.bundles).toEqual([]);
    expect(summary.canBuyMore).toBe(false);
  });

  test("prices bundles in the requested currency, else the catalog's", () => {
    const cat = catalog({ creditBundles: bundles(), defaultCurrency: "eur" });
    const [inEur] = deriveCreditBalances(balances(), {
      locale: L,
      catalog: cat,
    });
    expect(inEur.bundles[0].priceText).toBe("€20.00");
    const [inUsd] = deriveCreditBalances(balances(), {
      locale: L,
      catalog: cat,
      currency: "USD",
    });
    expect(inUsd.bundles[0].priceText).toBe("$25.00");
    const [inGbp] = deriveCreditBalances(balances(), {
      locale: L,
      catalog: cat,
      currency: "gbp",
    });
    expect(inGbp.bundles[0].priceText).toBeNull();
  });

  test("prices custom-quantity bundles per credit", () => {
    const [summary] = deriveCreditBalances(balances(), {
      locale: L,
      catalog: catalog({
        creditBundles: [
          creditBundle({
            credit: aiCredits(),
            quantity: null,
            prices: [],
            unitPrices: [oneTime(5)],
          }),
        ],
      }),
    });
    expect(summary.bundles[0]).toMatchObject({
      quantity: null,
      quantityText: null,
      priceText: "$0.05",
      isPerCredit: true,
      unit: "AI credit",
    });
  });
});
