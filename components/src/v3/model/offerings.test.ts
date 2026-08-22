import { proCompanyCatalog, publicCatalog } from "../fixtures/scenarios";

import { derivePlanOfferings } from "./offerings";

const L = "en-US";

describe("derivePlanOfferings (public tier)", () => {
  test("offers the periods and currencies the catalog is sold at, default first", () => {
    const offerings = derivePlanOfferings(publicCatalog(), { locale: L });
    expect(offerings.periods).toEqual(["month", "year"]);
    expect(offerings.currencies).toEqual(["usd", "eur"]);
    expect(offerings.period).toBe("month");
    expect(offerings.currency).toBe("usd");
  });

  test("re-snaps an unoffered selection", () => {
    const offerings = derivePlanOfferings(publicCatalog(), {
      locale: L,
      period: "quarter",
      currency: "gbp",
    });
    expect(offerings.period).toBe("month");
    expect(offerings.currency).toBe("usd");
  });

  test("prices every plan at the selection and keeps free plans", () => {
    const offerings = derivePlanOfferings(publicCatalog(), {
      locale: L,
      period: "year",
    });
    expect(offerings.plans.map((p) => p.name)).toEqual([
      "Free",
      "Pro",
      "Enterprise",
    ]);
    const [free, pro] = offerings.plans;
    expect(free.price).toMatchObject({ kind: "priced", amount: 0 });
    expect(pro.price).toMatchObject({
      kind: "priced",
      text: "$490.00",
      periodWord: "year",
    });
    expect(pro.priceId).toBe("price_pro_y");
  });

  test("renders $0 as Free when asked", () => {
    const offerings = derivePlanOfferings(publicCatalog(), {
      locale: L,
      showZeroPriceAsFree: true,
    });
    expect(offerings.plans[0].price).toEqual({ kind: "free" });
  });

  test("shows a monthly equivalent for yearly billing", () => {
    const offerings = derivePlanOfferings(publicCatalog(), {
      locale: L,
      period: "year",
      showAsMonthlyPrices: true,
    });
    expect(offerings.plans[1].price).toMatchObject({
      kind: "priced",
      text: "$40.83",
      periodWord: "month",
      billedPeriodWord: "year",
    });
  });

  test("drops plans not sold in the selected currency", () => {
    const offerings = derivePlanOfferings(publicCatalog(), {
      locale: L,
      currency: "eur",
    });
    expect(offerings.plans.map((p) => p.name)).toEqual(["Free", "Pro"]);
    expect(offerings.plans[1].price).toMatchObject({ text: "€45.00" });
  });

  test("honours a currency filter", () => {
    const offerings = derivePlanOfferings(publicCatalog(), {
      locale: L,
      currencyFilter: ["EUR"],
    });
    expect(offerings.currencies).toEqual(["eur"]);
    expect(offerings.currency).toBe("eur");
  });

  test("computes savings for the period toggle", () => {
    const offerings = derivePlanOfferings(publicCatalog(), { locale: L });
    // Pro: $49 × 12 = $588 vs $490 → 16.67%
    expect(offerings.savings.year).toBeCloseTo(0.1667, 3);
    expect(offerings.savings.month).toBeUndefined();
  });

  test("names the preceding plan for inclusion text", () => {
    const offerings = derivePlanOfferings(publicCatalog(), { locale: L });
    expect(offerings.plans.map((p) => p.inclusionOf)).toEqual([
      null,
      "Free",
      "Pro",
    ]);
  });

  test("one-time add-ons carry their one-time price at any period", () => {
    const offerings = derivePlanOfferings(publicCatalog(), {
      locale: L,
      period: "year",
    });
    const onboarding = offerings.addOns.find(
      (a) => a.id === "addon_onboarding",
    );
    expect(onboarding?.period).toBe("one_time");
    expect(onboarding?.price).toMatchObject({
      text: "$500.00",
      periodWord: "one-time",
    });
  });

  test("add-on rows keep only unlimited and metered entitlements", () => {
    const offerings = derivePlanOfferings(publicCatalog(), { locale: L });
    const analytics = offerings.addOns.find((a) => a.id === "addon_analytics");
    expect(analytics?.entitlements.map((e) => e.value.kind)).toEqual([
      "unlimited",
    ]);
  });

  test("public tier: every CTA is a plain select with a trial where offered", () => {
    const offerings = derivePlanOfferings(publicCatalog(), { locale: L });
    expect(offerings.plans.map((p) => p.action.kind)).toEqual([
      "select",
      "select",
      "select",
    ]);
    expect(offerings.plans[1].action.trial).toEqual({
      days: 14,
      paymentMethodRequired: false,
    });
    expect(offerings.plans.every((p) => !p.action.disabled)).toBe(true);
  });

  test("disables every CTA when the catalog cannot check out", () => {
    const catalog = publicCatalog();
    catalog.capabilities.checkout = false;
    const offerings = derivePlanOfferings(catalog, { locale: L });
    expect(offerings.plans[1].action).toMatchObject({
      disabled: true,
      reason: "checkout_disabled",
    });
  });

  test("carries the custom-plan CTA", () => {
    const offerings = derivePlanOfferings(publicCatalog(), { locale: L });
    expect(offerings.customPlan).toMatchObject({ text: "Talk to sales" });
  });

  test("includes credit lines on plans that grant credits", () => {
    const offerings = derivePlanOfferings(publicCatalog(), { locale: L });
    expect(offerings.plans[1].credits).toEqual([
      expect.objectContaining({
        quantityText: "500",
        unit: "AI credits",
        periodWord: "month",
      }),
    ]);
    const hidden = derivePlanOfferings(publicCatalog(), {
      locale: L,
      showCredits: false,
    });
    expect(hidden.plans[1].credits).toEqual([]);
  });
});

describe("derivePlanOfferings (company tier)", () => {
  test("marks the current plan at the subscribed price only", () => {
    const monthly = derivePlanOfferings(proCompanyCatalog(), { locale: L });
    expect(monthly.plans[1]).toMatchObject({ isCurrent: true, isActive: true });
    expect(monthly.plans[1].action.kind).toBe("current");

    const yearly = derivePlanOfferings(proCompanyCatalog(), {
      locale: L,
      period: "year",
    });
    expect(yearly.plans[1]).toMatchObject({ isCurrent: true, isActive: false });
    expect(yearly.plans[1].action.kind).toBe("select");
  });

  test("labels direction relative to the current plan", () => {
    const offerings = derivePlanOfferings(proCompanyCatalog(), { locale: L });
    expect(offerings.plans.map((p) => p.action.direction)).toEqual([
      "downgrade",
      null,
      "upgrade",
    ]);
  });

  test("an invalid plan is disabled with its reason and violations", () => {
    const catalog = proCompanyCatalog();
    catalog.plans[0] = {
      ...catalog.plans[0],
      valid: false,
      invalidReason: "feature_usage_exceeded",
      usageViolations: [
        { featureId: "f", featureName: "API calls", usage: 5, limit: 1 },
      ],
    };
    const offerings = derivePlanOfferings(catalog, { locale: L });
    expect(offerings.plans[0].action).toMatchObject({
      disabled: true,
      reason: "feature_usage_exceeded",
    });
    expect(offerings.plans[0].usageViolations).toEqual(["API calls"]);
  });

  test("blocked self-service downgrades hand off to the configured URL", () => {
    const catalog = proCompanyCatalog();
    catalog.checkoutBehavior = {
      ...catalog.checkoutBehavior,
      preventSelfServiceDowngrade: true,
      preventSelfServiceDowngradeButtonText: "Contact us",
      preventSelfServiceDowngradeUrl: "https://example.com/help",
    };
    const offerings = derivePlanOfferings(catalog, { locale: L });
    expect(offerings.plans[0].action.downgradeBlocked).toEqual({
      label: "Contact us",
      url: "https://example.com/help",
    });
    expect(offerings.plans[0].action.disabled).toBe(false);
    expect(offerings.plans[2].action.downgradeBlocked).toBeNull();
  });

  test("trials are offered only when the company can trial", () => {
    const catalog = proCompanyCatalog();
    catalog.plans[1] = {
      ...catalog.plans[1],
      current: false,
      currentPriceId: null,
    };
    const without = derivePlanOfferings(catalog, { locale: L });
    expect(without.plans[1].action.trial).toBeNull();
    catalog.plans[1] = { ...catalog.plans[1], companyCanTrial: true };
    catalog.checkoutBehavior = {
      ...catalog.checkoutBehavior,
      trialPaymentMethodRequired: true,
    };
    const withTrial = derivePlanOfferings(catalog, { locale: L });
    expect(withTrial.plans[1].action.trial).toEqual({
      days: 14,
      paymentMethodRequired: true,
    });
  });

  test("a held add-on is removable at its price and changeable at another", () => {
    const catalog = proCompanyCatalog();
    catalog.addOns[0] = {
      ...catalog.addOns[0],
      current: true,
      currentPriceId: "price_analytics_m",
    };
    expect(
      derivePlanOfferings(catalog, { locale: L }).addOns[0].action.kind,
    ).toBe("remove");
    expect(
      derivePlanOfferings(catalog, { locale: L, period: "year" }).addOns[0]
        .action.kind,
    ).toBe("change");
  });
});
