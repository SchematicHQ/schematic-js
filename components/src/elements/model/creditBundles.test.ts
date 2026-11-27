import {
  catalog,
  catalogPlan,
  company,
  companyOn,
  creditBundle,
  oneTime,
  subscription,
} from "../fixtures/checkout";

import { bundlePlanId, deriveCreditBundles } from "./creditBundles";

const L = "en-US";

const ai = {
  creditId: "bcr_ai",
  creditName: "AI credit",
  creditPluralName: "AI credits",
  creditSingularName: "AI credit",
};

describe("deriveCreditBundles", () => {
  const pro = catalogPlan({ current: true, id: "plan_pro" });

  test("formats each bundle's credits and price in catalog order", () => {
    const view = deriveCreditBundles(
      catalog({
        creditBundles: [
          creditBundle({ ...ai, name: "Booster", quantity: 1500 }),
          creditBundle({ ...ai, name: "One", quantity: 1 }),
        ],
        plans: [pro],
      }),
      companyOn(pro),
      { locale: L },
    );
    expect(view.rows.map((r) => [r.name, r.creditsText, r.unitName])).toEqual([
      ["Booster", "1,500", "AI credits"],
      ["One", "1", "AI credit"],
    ]);
    expect(view.rows[0].priceText).toBe("$10.00");
    expect(view.currency).toBe("usd");
  });

  test("leaves out bundles the plan cannot buy", () => {
    const view = deriveCreditBundles(
      catalog({
        creditBundles: [
          creditBundle({ name: "Any" }),
          creditBundle({ compatiblePlanIds: ["plan_pro"], name: "Pro only" }),
          creditBundle({ compatiblePlanIds: ["plan_other"], name: "Other" }),
          creditBundle({ compatiblePlanIds: [], name: "None" }),
        ],
        plans: [pro],
      }),
      companyOn(pro),
      { locale: L },
    );
    expect(view.rows.map((r) => r.name)).toEqual(["Any", "Pro only"]);
  });

  test("offers a company on no plan only the bundles every plan may buy", () => {
    const view = deriveCreditBundles(
      catalog({
        creditBundles: [
          creditBundle({ name: "Any" }),
          creditBundle({ compatiblePlanIds: ["plan_pro"], name: "Pro only" }),
        ],
      }),
      company(),
      { locale: L },
    );
    expect(view.rows.map((r) => r.name)).toEqual(["Any"]);
  });

  test("prices in the subscription's currency and drops bundles without one", () => {
    const view = deriveCreditBundles(
      catalog({
        creditBundles: [
          creditBundle({ name: "Dollars" }),
          creditBundle({
            currencyPrices: [
              { currency: "eur", price: oneTime(900, "eur") },
            ] as never,
            name: "Euros too",
          }),
        ],
        plans: [pro],
      }),
      companyOn(pro, { subscription: subscription({ currency: "eur" }) }),
      { locale: L },
    );
    expect(view.currency).toBe("eur");
    expect(view.rows.map((r) => [r.name, r.priceText])).toEqual([
      ["Euros too", "€9.00"],
    ]);
  });

  test("keeps the credits asked for", () => {
    const bundles = [
      creditBundle({ ...ai, name: "AI" }),
      creditBundle({ creditId: "bcr_export", name: "Export" }),
    ];
    const all = deriveCreditBundles(
      catalog({ creditBundles: bundles, plans: [pro] }),
      companyOn(pro),
      { locale: L },
    );
    expect(all.rows).toHaveLength(2);
    expect(all.rows.map((r) => r.name)).toEqual(["AI", "Export"]);

    const one = deriveCreditBundles(
      catalog({ creditBundles: bundles, plans: [pro] }),
      companyOn(pro),
      { credits: ["bcr_export"], locale: L },
    );
    expect(one.rows.map((r) => r.name)).toEqual(["Export"]);
  });

  test("prices a bundle sold by the credit per credit", () => {
    const view = deriveCreditBundles(
      catalog({
        creditBundles: [
          creditBundle({
            ...ai,
            price: undefined,
            quantity: null,
            unitPrice: oneTime(2),
          }),
        ],
        plans: [pro],
      }),
      companyOn(pro),
      { locale: L },
    );
    expect(view.rows[0]).toMatchObject({
      credits: null,
      creditsText: null,
      priceText: "$0.02",
      unitName: "AI credit",
    });
  });

  test.each([
    [{ expiryType: "no_expiry" }, { kind: "never" }],
    [
      { expiryType: "duration", expiryUnit: "days", expiryUnitCount: 90 },
      { kind: "afterDays", count: 90 },
    ],
    [
      {
        expiryType: "duration",
        expiryUnit: "billing_periods",
        expiryUnitCount: 2,
      },
      { kind: "afterPeriods", count: 2 },
    ],
    [{ expiryType: "duration", expiryUnitCount: null }, null],
    [{ expiryType: "end_of_billing_period" }, { kind: "periodEnd" }],
    [{ expiryType: "end_of_next_billing_period" }, { kind: "nextPeriodEnd" }],
    [{ expiryType: "end_of_trial" }, { kind: "trialEnd" }],
  ] as const)("reads expiry %o", (overrides, expiry) => {
    const view = deriveCreditBundles(
      catalog({
        creditBundles: [creditBundle(overrides as never)],
        plans: [pro],
      }),
      companyOn(pro),
      { locale: L },
    );
    expect(view.rows[0].expiry).toEqual(expiry);
  });
});

describe("bundlePlanId", () => {
  test("is the catalog's current plan", () => {
    const pro = catalogPlan({ current: true });
    expect(bundlePlanId(catalog({ plans: [pro] }), company())).toBe(pro.id);
  });

  test("passes over a current plan the company could start a trial on", () => {
    const trial = catalogPlan({
      companyCanTrial: true,
      current: true,
      isTrialable: true,
    });
    expect(
      bundlePlanId(
        catalog({ plans: [trial] }),
        company({ plan: { ...companyOn(trial).plan!, id: "plan_held" } }),
      ),
    ).toBe("plan_held");
  });
});
