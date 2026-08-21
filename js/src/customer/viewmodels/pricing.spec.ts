import { describe, expect, it } from "vitest";

import { EntitlementPriceBehavior, PlanPriceCadence } from "../api/public";

import { PricePeriod } from "./period";

import { entitlement, plan, price } from "./fixtures";
import { derivePlanOfferings } from "./pricing";

describe("derivePlanOfferings", () => {
  it("derives periods, resolves prices, and computes savings", () => {
    const vm = derivePlanOfferings(
      {
        addOns: [],
        plans: [plan()],
      },
      { period: PricePeriod.Year, locale: "en-US" },
    );

    expect(vm.periods).toEqual([PricePeriod.Month, PricePeriod.Year]);
    expect(vm.selectedPeriod).toBe(PricePeriod.Year);
    expect(vm.showPeriodToggle).toBe(true);

    const card = vm.plans[0];
    expect(card.price).toMatchObject({ kind: "priced" });
    if (card.price.kind === "priced") {
      expect(card.price.price.formatted).toBe("$100.00");
    }
    // $10/mo × 12 = $120 baseline vs $100 yearly → 16.67% saved.
    expect(card.savingsPercentVsMonthly).toBeCloseTo(16.67, 1);
  });

  it("re-snaps an unavailable period selection", () => {
    const vm = derivePlanOfferings(
      {
        addOns: [],
        plans: [plan()],
      },
      { period: PricePeriod.Quarter },
    );
    expect(vm.selectedPeriod).toBe(PricePeriod.Month);
  });

  it("adds a monthly equivalent when show_as_monthly_prices is on", () => {
    const vm = derivePlanOfferings(
      {
        addOns: [],
        plans: [plan()],
      },
      { period: PricePeriod.Year, locale: "en-US", showAsMonthlyPrices: true },
    );
    const card = vm.plans[0];
    if (card.price.kind === "priced") {
      expect(card.price.price.monthlyEquivalent?.formatted).toBe("$8.33");
    } else {
      expect.fail("expected a priced card");
    }
  });

  it("classifies zero-price plans as free or usage-based", () => {
    const free = plan({
      id: "plan_free",
      monthlyPrice: price({ price: 0, period: PricePeriod.Month }),
      yearlyPrice: undefined,
      availablePeriods: [PlanPriceCadence.Monthly],
    });
    const usageBased = plan({
      id: "plan_usage",
      monthlyPrice: price({ price: 0, period: PricePeriod.Month }),
      yearlyPrice: undefined,
      availablePeriods: [PlanPriceCadence.Monthly],
      entitlements: [
        entitlement({
          priceBehavior: EntitlementPriceBehavior.PayAsYouGo,
          meteredMonthlyPrice: price({
            price: 100,
            period: PricePeriod.Month,
          }),
        }),
      ],
    });

    const vm = derivePlanOfferings({
      addOns: [],
      plans: [free, usageBased],
    });
    expect(vm.plans[0].price.kind).toBe("free");
    expect(vm.plans[1].price.kind).toBe("usage_based");
  });

  it("carries company decoration onto the cards", () => {
    const vm = derivePlanOfferings({
      addOns: [],
      plans: [
        {
          ...plan(),
          companyCanTrial: false,
          current: true,
          valid: false,
          invalidReason: "feature_usage_exceeded",
        },
      ],
    });
    const card = vm.plans[0];
    expect(card.current).toBe(true);
    expect(card.valid).toBe(false);
    expect(card.invalidReason).toBe("feature_usage_exceeded");
  });

  it("resolves currency-specific prices and re-snaps unknown currencies", () => {
    const eurPlan = plan({
      currencyPrices: [
        {
          currency: "eur",
          monthlyPrice: price({
            price: 900,
            period: PricePeriod.Month,
            currency: "eur",
          }),
        },
        {
          currency: "usd",
          monthlyPrice: price({
            price: 1000,
            period: PricePeriod.Month,
          }),
        },
      ],
    });
    const vm = derivePlanOfferings(
      {
        addOns: [],
        defaultCurrency: "eur",
        plans: [eurPlan],
      },
      { currency: "EUR", period: PricePeriod.Month, locale: "en-US" },
    );
    // The catalog's default currency leads the picker; the rest sort.
    expect(vm.currencies).toEqual(["eur", "usd"]);
    expect(vm.selectedCurrency).toBe("eur");
    if (vm.plans[0].price.kind === "priced") {
      expect(vm.plans[0].price.price.formatted).toBe("€9.00");
    } else {
      expect.fail("expected a priced card");
    }

    const fallback = derivePlanOfferings(
      {
        addOns: [],
        defaultCurrency: "eur",
        plans: [eurPlan],
      },
      { currency: "gbp" },
    );
    expect(fallback.selectedCurrency).toBe("eur");
  });
});

describe("derivePlanOfferings review regressions", () => {
  it("marks a plan priced only in another currency unavailable, not usage-based", () => {
    const usdOnly = plan({
      availablePeriods: [PlanPriceCadence.Monthly],
      yearlyPrice: undefined,
    });
    const eurPlan = plan({
      id: "plan_eur",
      availablePeriods: [PlanPriceCadence.Monthly],
      yearlyPrice: undefined,
      currencyPrices: [
        {
          currency: "eur",
          monthlyPrice: price({
            price: 900,
            period: PricePeriod.Month,
            currency: "eur",
          }),
        },
      ],
    });
    const vm = derivePlanOfferings(
      {
        addOns: [],
        plans: [eurPlan, usdOnly],
      },
      { currency: "eur", period: PricePeriod.Month },
    );
    expect(vm.plans[0].price.kind).toBe("priced");
    expect(vm.plans[1].price.kind).toBe("unavailable");
  });

  it("treats null compatible_plan_ids as unrestricted and keeps explicit lists", () => {
    const vm = derivePlanOfferings(
      {
        addOns: [
          plan({ id: "addon_any", compatiblePlanIds: null }),
          plan({ id: "addon_scoped", compatiblePlanIds: ["plan_1"] }),
        ],
        plans: [plan()],
      },
      { period: PricePeriod.Month },
    );
    expect(vm.addOns[0].compatiblePlanIds).toBeUndefined();
    expect(vm.addOns[1].compatiblePlanIds).toEqual(["plan_1"]);
  });

  it("does not report savings against a zero selected-period price", () => {
    const vm = derivePlanOfferings(
      {
        addOns: [],
        plans: [
          plan({
            yearlyPrice: price({ price: 0, period: PricePeriod.Year }),
          }),
        ],
      },
      { period: PricePeriod.Year },
    );
    expect(vm.plans[0].savingsPercentVsMonthly).toBeUndefined();
  });

  it("drops an unconfigured custom-plan CTA and keeps configured fields", () => {
    const base = {
      addOns: [],
      plans: [plan()],
    };
    // The API serializes an unconfigured CTA as an object of nulls, which
    // deserializes to an object of undefineds — not as an absent object.
    const unconfigured = derivePlanOfferings({
      ...base,
      customPlanCta: {
        ctaText: undefined,
        ctaUrl: undefined,
        priceText: undefined,
      },
    });
    expect(unconfigured.customPlanCta).toBeUndefined();

    const configured = derivePlanOfferings({
      ...base,
      customPlanCta: { ctaText: "Contact us", ctaUrl: null, priceText: "" },
    });
    expect(configured.customPlanCta).toEqual({ ctaText: "Contact us" });
  });
});

describe("derivePlanOfferings branch-audit regressions", () => {
  const oneTimeAddOn = plan({
    availablePeriods: [],
    chargeType: "one_time" as never,
    id: "addon_once",
    monthlyPrice: undefined,
    name: "Onboarding",
    oneTimePrice: price({ period: PricePeriod.OneTime, price: 9900 }),
    yearlyPrice: undefined,
  });

  it("prices one-time offerings at their one-time price under any period toggle", () => {
    const vm = derivePlanOfferings(
      { addOns: [oneTimeAddOn], plans: [plan()] },
      { locale: "en-US", period: PricePeriod.Year },
    );
    expect(vm.selectedPeriod).toBe(PricePeriod.Year);
    // The toggle never offers one_time, even though it is an offered period.
    expect(vm.periods).toContain(PricePeriod.OneTime);
    expect(vm.togglePeriods).toEqual([PricePeriod.Month, PricePeriod.Year]);
    expect(vm.showPeriodToggle).toBe(true);
    // Asking for one_time re-snaps to the first recurring period instead of
    // blanking every recurring card.
    const snapped = derivePlanOfferings(
      { addOns: [oneTimeAddOn], plans: [plan()] },
      { locale: "en-US", period: PricePeriod.OneTime },
    );
    expect(snapped.selectedPeriod).toBe(PricePeriod.Month);
    expect(snapped.plans[0]?.price.kind).toBe("priced");
    const addOn = vm.addOns[0];
    expect(addOn?.period).toBe(PricePeriod.OneTime);
    expect(addOn?.price).toMatchObject({
      kind: "priced",
      price: { formatted: "$99.00", period: PricePeriod.OneTime },
    });
    // Recurring cards keep the selected period.
    expect(vm.plans[0]?.period).toBe(PricePeriod.Year);
  });

  it("collects currencies from every price slot and the credit bundles", () => {
    const vm = derivePlanOfferings(
      {
        addOns: [
          plan({
            ...oneTimeAddOn,
            oneTimePrice: price({
              currency: "gbp",
              period: PricePeriod.OneTime,
              price: 5000,
            }),
          }),
        ],
        creditBundles: [
          {
            bundleType: "fixed",
            creditId: "bcrd_1",
            creditName: "Credits",
            currencyPrices: [],
            expiryType: "never",
            expiryUnit: "month",
            id: "bndl_1",
            name: "Top-up",
            price: price({
              currency: "eur",
              period: PricePeriod.OneTime,
              price: 1000,
            }),
            quantity: 100,
          } as never,
        ],
        defaultCurrency: "",
        plans: [plan()],
      },
      { locale: "en-US" },
    );
    // An empty default_currency is unset: the first priced slot leads.
    expect(vm.currencies).toEqual(["usd", "eur", "gbp"]);
    expect(vm.defaultCurrency).toBe("usd");
  });

  it("never shows a bundle price in the wrong currency", () => {
    const bundle = {
      bundleType: "fixed",
      creditId: "bcrd_1",
      creditName: "Credits",
      currencyPrices: [
        {
          currency: "eur",
          price: price({
            currency: "eur",
            period: PricePeriod.OneTime,
            price: 900,
          }),
        },
      ],
      expiryType: "never",
      expiryUnit: "month",
      id: "bndl_1",
      name: "Top-up",
      price: price({ period: PricePeriod.OneTime, price: 1000 }),
      quantity: 100,
    } as never;
    const eurPlan = plan({
      currencyPrices: [
        {
          currency: "eur",
          monthlyPrice: price({
            currency: "eur",
            period: PricePeriod.Month,
            price: 900,
          }),
        },
      ],
    });
    const eur = derivePlanOfferings(
      { addOns: [], creditBundles: [bundle], plans: [eurPlan] },
      { currency: "eur", locale: "en-US" },
    );
    expect(eur.creditBundles[0]?.price?.formatted).toBe("€9.00");

    const gbpOnlyBundle = {
      ...(bundle as object),
      currencyPrices: [],
    } as never;
    const gbp = derivePlanOfferings(
      {
        addOns: [],
        creditBundles: [gbpOnlyBundle],
        plans: [
          plan({
            currencyPrices: [
              {
                currency: "gbp",
                monthlyPrice: price({
                  currency: "gbp",
                  period: PricePeriod.Month,
                  price: 800,
                }),
              },
            ],
          }),
        ],
      },
      { currency: "gbp", locale: "en-US" },
    );
    // The bundle is only priced in USD: no price under a GBP selection,
    // rather than a USD amount masquerading as GBP.
    expect(gbp.selectedCurrency).toBe("gbp");
    expect(gbp.creditBundles[0]?.price).toBeUndefined();
  });

  it("derives trial eligibility and add-on compatibility with the current plan", () => {
    const vm = derivePlanOfferings(
      {
        addOns: [
          plan({ id: "addon_any", name: "Any plan" }),
          plan({
            compatiblePlanIds: ["plan_other"],
            id: "addon_other",
            name: "Other only",
          }),
        ],
        plans: [
          { ...plan({ id: "plan_current", name: "Current" }), current: true },
          {
            ...plan({
              id: "plan_trial",
              isTrialable: true,
              name: "Trial",
              trialDays: 14,
            }),
            companyCanTrial: true,
          },
        ],
      },
      { locale: "en-US" },
    );
    expect(vm.plans.map((p) => [p.id, p.canTrial, p.trialDays])).toEqual([
      ["plan_current", false, undefined],
      ["plan_trial", true, 14],
    ]);
    expect(vm.addOns.map((a) => a.compatibleWithCurrentPlan)).toEqual([
      true,
      false,
    ]);

    // Without a current plan there is nothing to compare against.
    const anonymous = derivePlanOfferings(
      { addOns: [plan({ id: "addon_any" })], plans: [plan()] },
      { locale: "en-US" },
    );
    expect(anonymous.addOns[0]?.compatibleWithCurrentPlan).toBeUndefined();
    expect(anonymous.plans[0]?.canTrial).toBe(false);
  });

  it("surfaces the hard limit behind a soft limit only when asked", () => {
    const overage = entitlement({
      priceBehavior: EntitlementPriceBehavior.Overage,
      softLimit: 100,
      valueNumeric: 500,
    });
    const off = derivePlanOfferings(
      { addOns: [], plans: [plan({ entitlements: [overage] })] },
      { locale: "en-US" },
    );
    expect(off.plans[0]?.entitlements[0]?.overage).toEqual({ softLimit: 100 });

    const on = derivePlanOfferings(
      { addOns: [], plans: [plan({ entitlements: [overage] })] },
      { locale: "en-US", showHardLimit: true },
    );
    expect(on.plans[0]?.entitlements[0]?.overage).toEqual({
      formattedHardLimit: "500",
      hardLimit: 500,
      softLimit: 100,
    });
  });
});
