import { cardPaymentMethod } from "../fixtures/builders";
import {
  autoTopup,
  catalog,
  catalogAddOn,
  catalogPlan,
  checkoutField,
  company,
  companyOn,
  creditBundle,
  monthly,
  payInAdvanceEntitlement,
  subscription,
  yearly,
  type Currency,
} from "../fixtures/checkout";

import {
  cartReducer,
  checkoutCurrencies,
  initialCart,
  type CheckoutCart,
} from "./checkoutCart";
import { checkoutSelections } from "./checkoutSelections";

const pro = catalogPlan({ current: true, name: "Pro" });
const team = catalogPlan({ name: "Team" });

describe("initialCart", () => {
  test("opens on the company's plan, period, add-ons and card", () => {
    const addOn = catalogAddOn({ current: true });
    const card = cardPaymentMethod({ isDefault: true });
    const cart = initialCart({
      catalog: catalog({ addOns: [addOn], plans: [pro, team] }),
      company: companyOn(pro, {
        subscription: subscription({ period: "year" }),
      }),
      paymentMethods: [card],
    });
    expect(cart).toMatchObject({
      addOnIds: [addOn.id],
      currency: "usd",
      paymentMethodId: card.externalId,
      period: "year",
      planId: pro.id,
      trial: true,
    });
  });

  test("leaves a plan the company could trial for it to choose", () => {
    const trialable = catalogPlan({
      companyCanTrial: true,
      current: true,
      isTrialable: true,
    });
    const cart = initialCart({ catalog: catalog({ plans: [trialable] }) });
    expect(cart.planId).toBeUndefined();
  });

  // BypassConfig.planId, period, addOnIds, payInAdvanceQuantities, promoCode,
  // startTrialIfAvailable and currency, one row each.
  test.each<
    [string, Parameters<typeof initialCart>[0]["config"], Partial<CheckoutCart>]
  >([
    ["planId", { selection: { planId: team.id } }, { planId: team.id }],
    [
      "planId null is no plan",
      { selection: { planId: null } },
      { planId: undefined },
    ],
    [
      "an unknown planId is no plan",
      { selection: { planId: "plan_x" } },
      { planId: undefined },
    ],
    ["period", { selection: { period: "quarter" } }, { period: "quarter" }],
    [
      "addOnIds",
      { selection: { addOnIds: ["addon_9"] } },
      { addOnIds: ["addon_9"] },
    ],
    [
      "quantities, clamped",
      { selection: { quantities: { feat_a: 3.7, feat_b: -2 } } },
      { quantities: { feat_a: 3, feat_b: 0 } },
    ],
    [
      "promoCode",
      { selection: { promoCode: "SAVE10" } },
      { promoCode: "SAVE10" },
    ],
    ["trial", { selection: { trial: false } }, { trial: false }],
    [
      "currency, any case",
      { selection: { currency: "EUR" } },
      { currency: "eur" },
    ],
    [
      "a currency not sold is ignored",
      { selection: { currency: "gbp" } },
      { currency: "usd" },
    ],
  ])("%s", (_name, config, expected) => {
    const euro = catalogPlan({
      currencyPrices: [{ currency: "eur", monthlyPrice: monthly(2300, "eur") }],
    });
    const cart = initialCart({
      catalog: catalog({ plans: [pro, team, euro] }),
      config,
    });
    expect(cart).toMatchObject(expected);
  });

  test("a subscription fixes the currency, whatever the selection says", () => {
    const cart = initialCart({
      catalog: catalog({
        plans: [
          catalogPlan({
            currencyPrices: [
              { currency: "eur", monthlyPrice: monthly(1, "eur") },
            ],
          }),
        ],
      }),
      // The wire does not promise lowercase.
      company: company({
        subscription: subscription({ currency: "EUR" as Currency }),
      }),
      config: { selection: { currency: "usd" } },
    });
    expect(cart.currency).toBe("eur");
  });

  test("seeds pay-in-advance quantities from what the company has now", () => {
    const cart = initialCart({
      catalog: catalog({ plans: [pro] }),
      featureUsage: [
        {
          featureId: "feat_seats",
          priceBehavior: "pay_in_advance",
          allocation: 4,
        },
        { featureId: "feat_calls", priceBehavior: "overage", allocation: 1000 },
      ] as never,
      config: { selection: { quantities: { feat_other: 2 } } },
    });
    expect(cart.quantities).toEqual({ feat_seats: 4, feat_other: 2 });
  });

  test("takes a bundle bought one at a time as one, and prefills saved field values", () => {
    const field = checkoutField({ value: "PO-1" });
    const base = catalog({ plans: [pro] });
    const cart = initialCart({
      catalog: {
        ...base,
        checkoutSettings: {
          ...base.checkoutSettings,
          bundlePurchaseBehavior: "individual",
          customFields: [field],
        },
      },
      config: { selection: { creditBundles: { bundle_1: 5, bundle_2: 0 } } },
    });
    expect(cart.bundles).toEqual({ bundle_1: 1 });
    expect(cart.customFields).toEqual({ [field.id]: "PO-1" });
  });
});

describe("checkoutCurrencies", () => {
  test("offers what the plans are priced in, narrowed and ordered by the host", () => {
    const multi = catalog({
      plans: [
        catalogPlan({
          currencyPrices: [
            { currency: "eur", monthlyPrice: monthly(1, "eur") },
            { currency: "gbp", monthlyPrice: monthly(1, "gbp") },
          ],
        }),
      ],
    });
    expect(checkoutCurrencies(multi, undefined, undefined).options).toEqual([
      "usd",
      "eur",
      "gbp",
    ]);
    expect(
      checkoutCurrencies(multi, undefined, {
        currencies: ["GBP", "JPY", "usd"],
      }).options,
    ).toEqual(["gbp", "usd"]);
  });
});

describe("cartReducer", () => {
  const cart = initialCart({ catalog: catalog({ plans: [pro] }) });

  test("toggles add-ons, clamps quantities and drops a bundle counted to zero", () => {
    let next = cartReducer(cart, {
      type: "addOn",
      addOnId: "a",
      selected: true,
    });
    next = cartReducer(next, { type: "addOn", addOnId: "b", selected: true });
    next = cartReducer(next, { type: "addOn", addOnId: "a", selected: false });
    expect(next.addOnIds).toEqual(["b"]);

    next = cartReducer(next, {
      type: "quantity",
      featureId: "f",
      quantity: -1,
    });
    expect(next.quantities.f).toBe(0);

    next = cartReducer(next, { type: "bundle", bundleId: "x", quantity: 2 });
    next = cartReducer(next, { type: "bundle", bundleId: "x", quantity: 0 });
    expect(next.bundles).toEqual({});
  });

  test("merges a top-up choice and clears an empty promo code", () => {
    let next = cartReducer(cart, {
      type: "autoTopup",
      grantId: "g",
      choice: { enabled: true },
    });
    next = cartReducer(next, {
      type: "autoTopup",
      grantId: "g",
      choice: { amount: 300 },
    });
    expect(next.autoTopup.g).toEqual({ enabled: true, amount: 300 });
    expect(
      cartReducer(next, { type: "promoCode", promoCode: "" }).promoCode,
    ).toBeUndefined();
  });
});

describe("checkoutSelections", () => {
  test("prices the plan with its add-ons and pay-in-advance lines", () => {
    const seats = payInAdvanceEntitlement();
    const plan = catalogPlan({ entitlements: [seats] });
    const addOn = catalogAddOn();
    const cat = catalog({ addOns: [addOn], plans: [plan] });
    const cart: CheckoutCart = {
      ...initialCart({
        catalog: cat,
        config: { selection: { planId: plan.id } },
      }),
      addOnIds: [addOn.id],
      quantities: { [seats.featureId]: 4 },
      promoCode: "SAVE10",
    };
    expect(checkoutSelections(cart, cat)).toEqual({
      addOns: [{ addOnId: addOn.id, priceId: addOn.monthlyPrice?.id }],
      autoTopupOverrides: [],
      creditBundles: [],
      currency: "usd",
      customFieldValues: [],
      optInAccepted: undefined,
      payInAdvance: [{ priceId: seats.meteredMonthlyPrice?.id, quantity: 4 }],
      paymentMethodId: undefined,
      planId: plan.id,
      priceId: plan.monthlyPrice?.id,
      promoCode: "SAVE10",
      skipTrial: true,
    });
  });

  test("sends nothing for a plan not priced in the period", () => {
    const monthlyOnly = catalogPlan({ yearlyPrice: undefined });
    const cat = catalog({ plans: [monthlyOnly] });
    const cart = {
      ...initialCart({
        catalog: cat,
        config: { selection: { planId: monthlyOnly.id } },
      }),
      period: "year" as const,
    };
    expect(checkoutSelections(cart, cat)).toBeUndefined();
  });

  test("drops add-ons during a trial, and the add-ons a plan cannot carry", () => {
    const trialable = catalogPlan({ companyCanTrial: true, isTrialable: true });
    const other = catalogPlan();
    const onlyWithOther = catalogAddOn({ compatiblePlanIds: [other.id] });
    const anyPlan = catalogAddOn();
    const cat = catalog({
      addOns: [onlyWithOther, anyPlan],
      plans: [trialable, other],
    });
    const cart: CheckoutCart = {
      ...initialCart({
        catalog: cat,
        config: { selection: { planId: trialable.id } },
      }),
      addOnIds: [onlyWithOther.id, anyPlan.id],
    };
    expect(checkoutSelections(cart, cat)).toMatchObject({
      addOns: [],
      skipTrial: false,
    });
    expect(checkoutSelections({ ...cart, trial: false }, cat)).toMatchObject({
      addOns: [{ addOnId: anyPlan.id }],
      skipTrial: true,
    });
  });

  test("buys bundles on their own with no plan, and never a bundle at zero", () => {
    const bundle = creditBundle();
    const unpriced = creditBundle({ price: yearly(1, "eur") });
    const cat = catalog({ creditBundles: [bundle, unpriced], plans: [pro] });
    const cart: CheckoutCart = {
      ...initialCart({ catalog: cat, config: { selection: { planId: null } } }),
      bundles: { [bundle.id]: 2, [unpriced.id]: 1 },
    };
    const selections = checkoutSelections(cart, cat);
    expect(selections).toMatchObject({
      creditBundles: [{ bundleId: bundle.id, quantity: 2 }],
    });
    expect(selections).not.toHaveProperty("planId");
    expect(checkoutSelections({ ...cart, bundles: {} }, cat)).toBeUndefined();
  });

  test("overrides only the top-ups the company may choose", () => {
    const choosable = autoTopup();
    const automatic = autoTopup({ availability: "automatic" });
    const plan = catalogPlan({ autoTopups: [choosable, automatic] });
    const cat = catalog({ plans: [plan] });
    const cart: CheckoutCart = {
      ...initialCart({
        catalog: cat,
        config: { selection: { planId: plan.id } },
      }),
      autoTopup: {
        [choosable.planCreditGrantId]: { enabled: false },
        [automatic.planCreditGrantId]: { enabled: false },
      },
    };
    expect(checkoutSelections(cart, cat)?.autoTopupOverrides).toEqual([
      {
        autoTopupAmount: undefined,
        autoTopupEnabled: false,
        autoTopupThresholdCredits: undefined,
        planCreditGrantId: choosable.planCreditGrantId,
      },
    ]);
  });

  test("sends only custom fields with a value", () => {
    const cat = catalog({ plans: [pro] });
    const cart: CheckoutCart = {
      ...initialCart({
        catalog: cat,
        config: { selection: { planId: pro.id } },
      }),
      customFields: { cfc_1: "PO-1", cfc_2: "  " },
    };
    expect(checkoutSelections(cart, cat)?.customFieldValues).toEqual([
      { id: "cfc_1", value: "PO-1" },
    ]);
  });
});
