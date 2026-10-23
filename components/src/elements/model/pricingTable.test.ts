import type { CatalogView } from "@schematichq/schematic-react";

import {
  catalogCreditGrant,
  catalogEntitlement,
  catalogPlan,
  catalogPrice,
  company,
  companyCatalog,
  companySubscription,
  publicCatalog,
  publicCatalogPlan,
} from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";

import { derivePricingTable } from "./pricingTable";

const L = "en-US";

function companyView(): CatalogView {
  const data = SCENARIOS.pricingTable();
  return { source: "company", catalog: data.catalog! };
}

function publicView(): CatalogView {
  const data = SCENARIOS.pricingTablePublic();
  return { source: "public", catalog: data.publicCatalog! };
}

describe("derivePricingTable", () => {
  test("offers the periods and currencies the catalog prices in", () => {
    const view = derivePricingTable(publicView(), { locale: L });
    expect(view.periods).toEqual(["month", "year"]);
    expect(view.period).toBe("month");
    expect(view.currencies).toEqual(["usd"]);
    expect(view.currency).toBe("usd");
  });

  test("prices every card in the period asked for, and a one-time add-on once", () => {
    const view = derivePricingTable(publicView(), {
      locale: L,
      period: "year",
    });
    expect(view.plans.map((plan) => plan.price)).toEqual([
      { kind: "amount", amount: "$0.00", period: "year" },
      { kind: "amount", amount: "$290.00", period: "year" },
      { kind: "amount", amount: "$990.00", period: "year" },
    ]);
    expect(view.addOns.map((addOn) => [addOn.name, addOn.price])).toEqual([
      [
        "Priority support",
        { kind: "amount", amount: "$490.00", period: "year" },
      ],
      ["Onboarding", { kind: "amount", amount: "$500.00", period: null }],
    ]);
    expect(view.plans[1].priceId).toBe(
      view.plans[1].source.currencyPrices[0].yearlyPrice?.id,
    );
  });

  test("falls back from a period or currency the catalog does not offer", () => {
    const view = derivePricingTable(publicView(), {
      locale: L,
      period: "quarter",
      currency: "eur",
    });
    expect(view.period).toBe("month");
    expect(view.currency).toBe("usd");
  });

  test("opens on the period the company's subscription bills in", () => {
    const view = companyView();
    const yearly = derivePricingTable(view, {
      locale: L,
      company: company({
        subscription: companySubscription({ period: "year" }),
      }),
    });
    expect(yearly.period).toBe("year");
  });

  test("hides a plan with no price in the currency, keeps one priced in none", () => {
    const euro = publicCatalogPlan({
      name: "Euro",
      currencyPrices: [
        { currency: "eur", monthlyPrice: catalogPrice({ currency: "eur" }) },
      ],
    });
    const free = publicCatalogPlan({ name: "Free", currencyPrices: [] });
    const view = derivePricingTable(
      {
        source: "public",
        catalog: publicCatalog({
          plans: [publicCatalogPlan({ name: "Pro" }), euro, free],
        }),
      },
      { locale: L },
    );
    expect(view.currencies).toEqual(["usd", "eur"]);
    expect(view.plans.map((plan) => plan.name)).toEqual(["Pro", "Free"]);
    expect(
      derivePricingTable(
        {
          source: "public",
          catalog: publicCatalog({ plans: [euro, free] }),
        },
        { locale: L, currency: "eur" },
      ).plans.map((plan) => plan.name),
    ).toEqual(["Euro", "Free"]);
  });

  test("reads a zero price as free only when asked, and as usage-based with a priced feature", () => {
    const metered = publicCatalogPlan({
      monthly: 0,
      entitlements: [catalogEntitlement({ priceBehavior: "pay_as_you_go" })],
    });
    const free = publicCatalogPlan({ monthly: 0 });
    const catalog = publicCatalog({ plans: [metered, free] });
    expect(
      derivePricingTable(
        { source: "public", catalog },
        { locale: L },
      ).plans.map((plan) => plan.price.kind),
    ).toEqual(["usageBased", "amount"]);
    expect(
      derivePricingTable(
        { source: "public", catalog },
        { locale: L, showZeroPriceAsFree: true },
      ).plans[1].price,
    ).toEqual({ kind: "free" });
  });

  test("leaves a hidden credit off the card, and the grant in the source", () => {
    const view = derivePricingTable(companyView(), { locale: L });
    const pro = view.plans[1];
    expect(pro.credits).toEqual([
      expect.objectContaining({
        amount: "100",
        creditName: "AI credits",
        period: "month",
        perLicense: null,
      }),
    ]);
    expect(pro.source.includedCreditGrants).toHaveLength(2);
    expect(
      derivePricingTable(companyView(), { locale: L, showCredits: false })
        .plans[1].credits,
    ).toEqual([]);
  });

  test("words a credit granted per license against the license", () => {
    const seat = catalogEntitlement({
      featureName: "Seat",
      licenseId: "lic_1",
    });
    const plan = publicCatalogPlan({
      entitlements: [seat],
      includedCreditGrants: [
        catalogCreditGrant({ scaling: "per_license", licenseId: "lic_1" }),
        catalogCreditGrant({ scaling: "per_license", licenseId: "lic_1" }),
      ],
    });
    const view = derivePricingTable(
      { source: "public", catalog: publicCatalog({ plans: [plan] }) },
      { locale: L },
    );
    expect(view.plans[0].credits).toEqual([
      expect.objectContaining({ amount: "100", perLicense: "Seat" }),
      expect.objectContaining({ amount: "100", perLicense: "Seat" }),
    ]);
  });

  test("words each kind of entitlement", () => {
    const view = derivePricingTable(companyView(), { locale: L });
    const rows = view.plans[1].entitlements;
    expect(rows.map((row) => row.text)).toEqual([
      { kind: "units", amount: "10,000", units: "API calls", period: "month" },
      {
        kind: "perUnit",
        cost: "$10.00",
        size: null,
        units: "Seat",
        period: "month",
      },
      {
        kind: "units",
        amount: "50",
        units: "GB of storage",
        period: null,
      },
      { kind: "name", name: "SSO" },
      { kind: "unlimited", item: "Projects" },
    ]);
    expect(rows[2].detail).toEqual({
      kind: "overage",
      cost: "$0.50",
      size: null,
      units: "GB of storage",
      period: "month",
    });
    expect(rows[2].hardLimit).toEqual({
      amount: "100",
      units: "GB of storage",
    });
  });

  test("words a credit-burning feature by its rate, or its limit without credits shown", () => {
    const burn = catalogEntitlement({
      featureName: "Image",
      priceBehavior: "credit_burndown",
      consumptionRate: 4,
      creditEquivalentLimit: 25,
      creditId: "bilcr_ai",
      creditName: "AI credit",
    });
    const plan = publicCatalogPlan({
      entitlements: [burn],
      includedCreditGrants: [catalogCreditGrant({ creditId: "bilcr_ai" })],
    });
    const catalog = publicCatalog({ plans: [plan] });
    expect(
      derivePricingTable({ source: "public", catalog }, { locale: L }).plans[0]
        .entitlements[0].text,
    ).toEqual({
      kind: "perUse",
      amount: "4",
      credits: "AI credits",
      unit: "Image",
    });
    expect(
      derivePricingTable(
        { source: "public", catalog },
        { locale: L, showCredits: false },
      ).plans[0].entitlements[0].text,
    ).toEqual({ kind: "upTo", amount: "25", units: "Images", period: "month" });
  });

  test("shows the warning threshold in place of the limit when asked", () => {
    const plan = publicCatalogPlan({
      entitlements: [catalogEntitlement({ warningThreshold: 800 })],
    });
    const catalog = publicCatalog({ plans: [plan] });
    expect(
      derivePricingTable(
        { source: "public", catalog },
        { locale: L, showWarningThresholdAsLimit: true },
      ).plans[0].entitlements[0].text,
    ).toMatchObject({ amount: "800" });
  });

  test("marks a tiered feature and carries its tiers", () => {
    const tiered = catalogEntitlement({
      featureName: "Event",
      priceBehavior: "tier",
      currencyPrices: [
        {
          currency: "usd",
          monthlyPrice: catalogPrice({
            price: 0,
            tiersMode: "graduated",
            priceTiers: [
              { from: 0, to: 1000, perUnitPrice: 0 },
              { from: 1001, perUnitPrice: 2 },
            ],
          }),
        },
      ],
    });
    const plan = publicCatalogPlan({ entitlements: [tiered] });
    const row = derivePricingTable(
      { source: "public", catalog: publicCatalog({ plans: [plan] }) },
      { locale: L },
    ).plans[0].entitlements[0];
    expect(row.text).toEqual({ kind: "name", name: "Event" });
    expect(row.detail).toEqual({ kind: "tiered" });
    expect(row.tiers).toMatchObject({
      currency: "usd",
      mode: "graduated",
      unit: "Event",
    });
    expect(row.tiers?.ranges).toHaveLength(2);
  });

  test("takes no standing from the public catalog", () => {
    const view = derivePricingTable(publicView(), { locale: L });
    expect(view.source).toBe("public");
    expect(view.plans.every((plan) => plan.action === null)).toBe(true);
    expect(view.plans.some((plan) => plan.active)).toBe(false);
  });

  test("takes each plan's standing from the company's view", () => {
    const view = derivePricingTable(companyView(), {
      locale: L,
      company: SCENARIOS.pricingTable().company,
    });
    expect(view.plans.map((plan) => plan.action)).toEqual([
      { kind: "choose", upgrade: false },
      { kind: "current" },
      {
        kind: "overLimit",
        violations: [
          { featureName: "API call", usage: "120,000", limit: "100,000" },
        ],
      },
    ]);
    expect(view.plans[1].active).toBe(true);
    expect(view.plans[2].trialDays).toBe(14);
  });

  test("lets the company choose its own plan in another period", () => {
    const view = derivePricingTable(companyView(), {
      locale: L,
      period: "year",
      company: SCENARIOS.pricingTable().company,
    });
    expect(view.plans[1]).toMatchObject({
      active: false,
      action: { kind: "choose", upgrade: false },
    });
  });

  test("blocks a downgrade the account keeps out of self-service", () => {
    const catalog = companyCatalog({
      plans: [
        catalogPlan({
          valid: false,
          invalidReason: "downgrade_not_permitted",
        }),
        catalogPlan({ current: true }),
      ],
      preventSelfServiceDowngrade: true,
      preventSelfServiceDowngradeButtonText: "Contact us",
      preventSelfServiceDowngradeUrl: "https://example.com/contact",
    });
    expect(
      derivePricingTable({ source: "company", catalog }, { locale: L }).plans[0]
        .action,
    ).toEqual({
      kind: "downgradeBlocked",
      text: "Contact us",
      url: "https://example.com/contact",
    });
  });

  test("disables every choice when the company cannot check out", () => {
    const catalog = companyCatalog({
      capabilities: { badgeVisibility: false, checkout: false },
      plans: [catalogPlan()],
    });
    expect(
      derivePricingTable({ source: "company", catalog }, { locale: L }).plans[0]
        .action,
    ).toEqual({ kind: "unavailable" });
  });

  test("offers to remove an add-on the company holds", () => {
    const catalog = companyCatalog({
      addOns: [catalogPlan({ name: "Support", current: true })],
    });
    const options = {
      locale: L,
      company: company({
        subscription: companySubscription({ period: "month" }),
      }),
    };
    const view = derivePricingTable({ source: "company", catalog }, options);
    expect(view.addOns[0].action).toEqual({ kind: "remove" });
    expect(
      derivePricingTable(
        { source: "company", catalog },
        {
          ...options,
          period: "year",
        },
      ).addOns[0].action,
    ).toEqual({ kind: "change" });
  });

  test("passes the custom plan's call to action through", () => {
    expect(derivePricingTable(companyView(), { locale: L }).customPlan).toEqual(
      {
        ctaText: "Talk to sales",
        ctaUrl: "https://example.com/sales",
        priceText: "Let's talk",
      },
    );
    expect(derivePricingTable(publicView(), { locale: L }).customPlan).toBe(
      null,
    );
  });

  test("counts down a trial in days", () => {
    const now = new Date("2026-08-21T12:00:00.000Z");
    const view = derivePricingTable(companyView(), {
      locale: L,
      now,
      company: company({
        subscription: companySubscription({
          status: "trialing",
          trialEnd: new Date("2026-08-24T00:00:00.000Z"),
        }),
      }),
    });
    expect(view.trialDaysLeft).toEqual({ count: 3, days: "3" });
  });
});
