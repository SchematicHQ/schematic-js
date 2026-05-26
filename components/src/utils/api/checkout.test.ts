import type { BillingPriceView } from "../../api/checkoutexternal";
import { PlanIcon } from "../../api/checkoutexternal";
import type {
  CreditBundle,
  SelectedPlan,
  UsageBasedEntitlement,
} from "../../types";
import {
  buildAddOnRequestBody,
  buildCreditBundlesRequestBody,
  buildPayInAdvanceRequestBody,
  isScheduledCheckoutConflictMessage,
} from "./checkout";

function makeUsageBasedEntitlement(
  overrides: Partial<UsageBasedEntitlement> = {},
): UsageBasedEntitlement {
  return {
    createdAt: new Date(),
    currencyPrices: [],
    environmentId: "env-1",
    featureId: "feat-1",
    id: "ent-1",
    planId: "plan-1",
    ruleId: "rule-1",
    updatedAt: new Date(),
    valueType: "numeric" as any,
    allocation: 0,
    usage: 0,
    quantity: 0,
    ...overrides,
  };
}

function makeSelectedPlan(overrides: Partial<SelectedPlan> = {}): SelectedPlan {
  return {
    availablePeriods: [],
    billingStrategy: "schematic_managed",
    chargeType: "recurring" as any,
    companyCanTrial: false,
    companyCount: 0,
    compatiblePlanIds: [],
    controlledBy: "self_serve" as any,
    createdAt: new Date(),
    currencyPrices: [],
    current: false,
    custom: false,
    description: "",
    entitlements: [],
    features: [],
    icon: PlanIcon.Blue,
    id: "addon-1",
    includedCreditGrants: [],
    isCustom: false,
    isDefault: false,
    isFree: false,
    isTrialable: false,
    name: "Add-on",
    planType: "add_on" as any,
    updatedAt: new Date(),
    usageViolations: [],
    valid: true,
    versions: [],
    isSelected: false,
    ...overrides,
  };
}

function makeBillingPriceView(
  overrides: Partial<BillingPriceView> = {},
): BillingPriceView {
  return {
    billingScheme: "per_unit" as any,
    createdAt: new Date(),
    currency: "USD",
    id: "price-view-1",
    interval: "month" as any,
    intervalCount: 1,
    isActive: true,
    packageSize: 1,
    price: 1000,
    priceExternalId: "ext-1",
    priceId: "price-id-1",
    priceTier: [],
    productExternalId: "prod-ext-1",
    productId: "prod-1",
    productName: "Product",
    providerType: "stripe" as any,
    updatedAt: new Date(),
    usageType: "licensed" as any,
    ...overrides,
  };
}

function makeCreditBundle(overrides: Partial<CreditBundle> = {}): CreditBundle {
  return {
    bundleType: "one_time" as any,
    createdAt: new Date(),
    creditId: "credit-1",
    creditName: "Credits",
    currencyPrices: [],
    expiryType: "never" as any,
    expiryUnit: "month" as any,
    hasGrants: false,
    id: "bundle-1",
    name: "Bundle",
    status: "active" as any,
    updatedAt: new Date(),
    count: 0,
    ...overrides,
  };
}

describe("buildPayInAdvanceRequestBody", () => {
  it("should return an empty array for empty entitlements", () => {
    const result = buildPayInAdvanceRequestBody({
      entitlements: [],
      period: "month",
    });
    expect(result).toEqual([]);
  });

  it("should pick monthly price when period is month", () => {
    const entitlements = [
      makeUsageBasedEntitlement({
        meteredMonthlyPrice: makeBillingPriceView({
          priceId: "monthly-price-1",
        }),
        meteredYearlyPrice: makeBillingPriceView({
          priceId: "yearly-price-1",
        }),
        quantity: 5,
      }),
    ];

    const result = buildPayInAdvanceRequestBody({
      entitlements,
      period: "month",
    });

    expect(result).toEqual([{ priceId: "monthly-price-1", quantity: 5 }]);
  });

  it("should pick yearly price when period is year", () => {
    const entitlements = [
      makeUsageBasedEntitlement({
        meteredMonthlyPrice: makeBillingPriceView({
          priceId: "monthly-price-1",
        }),
        meteredYearlyPrice: makeBillingPriceView({
          priceId: "yearly-price-1",
        }),
        quantity: 10,
      }),
    ];

    const result = buildPayInAdvanceRequestBody({
      entitlements,
      period: "year",
    });

    expect(result).toEqual([{ priceId: "yearly-price-1", quantity: 10 }]);
  });

  it("should skip entitlements without a matching price for the period", () => {
    const entitlements = [
      makeUsageBasedEntitlement({
        meteredMonthlyPrice: undefined,
        meteredYearlyPrice: makeBillingPriceView({
          priceId: "yearly-price-1",
        }),
        quantity: 5,
      }),
    ];

    const result = buildPayInAdvanceRequestBody({
      entitlements,
      period: "month",
    });
    expect(result).toEqual([]);
  });

  it("should skip entitlements without a priceId on the matching price", () => {
    const priceWithNoPriceId = makeBillingPriceView();
    // Force priceId to be falsy
    (priceWithNoPriceId as any).priceId = "";

    const entitlements = [
      makeUsageBasedEntitlement({
        meteredMonthlyPrice: priceWithNoPriceId,
        quantity: 5,
      }),
    ];

    const result = buildPayInAdvanceRequestBody({
      entitlements,
      period: "month",
    });
    expect(result).toEqual([]);
  });

  it("should handle multiple entitlements and filter correctly", () => {
    const entitlements = [
      makeUsageBasedEntitlement({
        meteredMonthlyPrice: makeBillingPriceView({
          priceId: "price-a",
        }),
        quantity: 3,
      }),
      makeUsageBasedEntitlement({
        meteredMonthlyPrice: undefined,
        quantity: 7,
      }),
      makeUsageBasedEntitlement({
        meteredMonthlyPrice: makeBillingPriceView({
          priceId: "price-c",
        }),
        quantity: 1,
      }),
    ];

    const result = buildPayInAdvanceRequestBody({
      entitlements,
      period: "month",
    });

    expect(result).toEqual([
      { priceId: "price-a", quantity: 3 },
      { priceId: "price-c", quantity: 1 },
    ]);
  });

  it("should include entitlements with zero quantity if they have a priceId", () => {
    const entitlements = [
      makeUsageBasedEntitlement({
        meteredMonthlyPrice: makeBillingPriceView({
          priceId: "price-zero",
        }),
        quantity: 0,
      }),
    ];

    const result = buildPayInAdvanceRequestBody({
      entitlements,
      period: "month",
    });
    expect(result).toEqual([{ priceId: "price-zero", quantity: 0 }]);
  });
});

describe("buildAddOnRequestBody", () => {
  it("should return an empty array for empty addOns", () => {
    const result = buildAddOnRequestBody({
      addOns: [],
      period: "month",
      shouldTrial: false,
    });
    expect(result).toEqual([]);
  });

  it("should exclude add-ons that are not selected", () => {
    const addOns = [
      makeSelectedPlan({
        id: "addon-1",
        isSelected: false,
        monthlyPrice: {
          id: "mp-1",
          price: 500,
          currency: "USD",
          externalPriceId: "ext-1",
          interval: "month" as any,
          intervalCount: 1,
          providerType: "stripe" as any,
          scheme: "per_unit" as any,
        },
      }),
    ];

    const result = buildAddOnRequestBody({
      addOns,
      period: "month",
      shouldTrial: false,
    });
    expect(result).toEqual([]);
  });

  it("should exclude all add-ons when shouldTrial is true", () => {
    const addOns = [
      makeSelectedPlan({
        id: "addon-1",
        isSelected: true,
        monthlyPrice: {
          id: "mp-1",
          price: 500,
          currency: "USD",
          externalPriceId: "ext-1",
          interval: "month" as any,
          intervalCount: 1,
          providerType: "stripe" as any,
          scheme: "per_unit" as any,
        },
      }),
    ];

    const result = buildAddOnRequestBody({
      addOns,
      period: "month",
      shouldTrial: true,
    });
    expect(result).toEqual([]);
  });

  it("should include a selected add-on with a monthly price when period is month", () => {
    const addOns = [
      makeSelectedPlan({
        id: "addon-1",
        isSelected: true,
        monthlyPrice: {
          id: "mp-1",
          price: 500,
          currency: "USD",
          externalPriceId: "ext-1",
          interval: "month" as any,
          intervalCount: 1,
          providerType: "stripe" as any,
          scheme: "per_unit" as any,
        },
      }),
    ];

    const result = buildAddOnRequestBody({
      addOns,
      period: "month",
      shouldTrial: false,
    });
    expect(result).toEqual([{ addOnId: "addon-1", priceId: "mp-1" }]);
  });

  it("should include a selected add-on with a yearly price when period is year", () => {
    const addOns = [
      makeSelectedPlan({
        id: "addon-1",
        isSelected: true,
        yearlyPrice: {
          id: "yp-1",
          price: 5000,
          currency: "USD",
          externalPriceId: "ext-1",
          interval: "year" as any,
          intervalCount: 1,
          providerType: "stripe" as any,
          scheme: "per_unit" as any,
        },
      }),
    ];

    const result = buildAddOnRequestBody({
      addOns,
      period: "year",
      shouldTrial: false,
    });
    expect(result).toEqual([{ addOnId: "addon-1", priceId: "yp-1" }]);
  });

  it("should include a selected add-on with zero price", () => {
    const addOns = [
      makeSelectedPlan({
        id: "addon-1",
        isSelected: true,
        monthlyPrice: {
          id: "mp-1",
          price: 0,
          currency: "USD",
          externalPriceId: "ext-1",
          interval: "month" as any,
          intervalCount: 1,
          providerType: "stripe" as any,
          scheme: "per_unit" as any,
        },
      }),
    ];

    const result = buildAddOnRequestBody({
      addOns,
      period: "month",
      shouldTrial: false,
    });
    expect(result).toEqual([{ addOnId: "addon-1", priceId: "mp-1" }]);
  });

  it("should exclude a selected add-on without a price for the period", () => {
    const addOns = [
      makeSelectedPlan({
        id: "addon-1",
        isSelected: true,
        monthlyPrice: undefined,
        yearlyPrice: undefined,
      }),
    ];

    const result = buildAddOnRequestBody({
      addOns,
      period: "month",
      shouldTrial: false,
    });
    expect(result).toEqual([]);
  });

  it("should use oneTimePrice for one_time charge type add-ons regardless of period", () => {
    const addOns = [
      makeSelectedPlan({
        id: "addon-ot",
        isSelected: true,
        chargeType: "one_time" as any,
        oneTimePrice: {
          id: "otp-1",
          price: 2000,
          currency: "USD",
          externalPriceId: "ext-1",
          interval: "month" as any,
          intervalCount: 1,
          providerType: "stripe" as any,
          scheme: "per_unit" as any,
        },
        monthlyPrice: undefined,
        yearlyPrice: undefined,
      }),
    ];

    const resultMonth = buildAddOnRequestBody({
      addOns,
      period: "month",
      shouldTrial: false,
    });
    expect(resultMonth).toEqual([{ addOnId: "addon-ot", priceId: "otp-1" }]);

    const resultYear = buildAddOnRequestBody({
      addOns,
      period: "year",
      shouldTrial: false,
    });
    expect(resultYear).toEqual([{ addOnId: "addon-ot", priceId: "otp-1" }]);
  });

  it("should handle multiple add-ons with mixed selection states", () => {
    const addOns = [
      makeSelectedPlan({
        id: "addon-1",
        isSelected: true,
        monthlyPrice: {
          id: "mp-1",
          price: 500,
          currency: "USD",
          externalPriceId: "ext-1",
          interval: "month" as any,
          intervalCount: 1,
          providerType: "stripe" as any,
          scheme: "per_unit" as any,
        },
      }),
      makeSelectedPlan({
        id: "addon-2",
        isSelected: false,
        monthlyPrice: {
          id: "mp-2",
          price: 300,
          currency: "USD",
          externalPriceId: "ext-2",
          interval: "month" as any,
          intervalCount: 1,
          providerType: "stripe" as any,
          scheme: "per_unit" as any,
        },
      }),
      makeSelectedPlan({
        id: "addon-3",
        isSelected: true,
        monthlyPrice: {
          id: "mp-3",
          price: 700,
          currency: "USD",
          externalPriceId: "ext-3",
          interval: "month" as any,
          intervalCount: 1,
          providerType: "stripe" as any,
          scheme: "per_unit" as any,
        },
      }),
    ];

    const result = buildAddOnRequestBody({
      addOns,
      period: "month",
      shouldTrial: false,
    });
    expect(result).toEqual([
      { addOnId: "addon-1", priceId: "mp-1" },
      { addOnId: "addon-3", priceId: "mp-3" },
    ]);
  });
});

describe("buildCreditBundlesRequestBody", () => {
  it("should return an empty array for empty credit bundles", () => {
    const result = buildCreditBundlesRequestBody([]);
    expect(result).toEqual([]);
  });

  it("should include bundles with count greater than zero", () => {
    const bundles = [
      makeCreditBundle({ id: "bundle-1", count: 3 }),
      makeCreditBundle({ id: "bundle-2", count: 1 }),
    ];

    const result = buildCreditBundlesRequestBody(bundles);

    expect(result).toEqual([
      { bundleId: "bundle-1", quantity: 3 },
      { bundleId: "bundle-2", quantity: 1 },
    ]);
  });

  it("should exclude bundles with count of zero", () => {
    const bundles = [makeCreditBundle({ id: "bundle-1", count: 0 })];

    const result = buildCreditBundlesRequestBody(bundles);
    expect(result).toEqual([]);
  });

  it("should exclude bundles with negative count", () => {
    const bundles = [makeCreditBundle({ id: "bundle-1", count: -1 })];

    const result = buildCreditBundlesRequestBody(bundles);
    expect(result).toEqual([]);
  });

  it("should handle a mix of zero and positive counts", () => {
    const bundles = [
      makeCreditBundle({ id: "bundle-1", count: 0 }),
      makeCreditBundle({ id: "bundle-2", count: 5 }),
      makeCreditBundle({ id: "bundle-3", count: 0 }),
      makeCreditBundle({ id: "bundle-4", count: 2 }),
    ];

    const result = buildCreditBundlesRequestBody(bundles);

    expect(result).toEqual([
      { bundleId: "bundle-2", quantity: 5 },
      { bundleId: "bundle-4", quantity: 2 },
    ]);
  });

  it("should map id to bundleId and count to quantity", () => {
    const bundles = [makeCreditBundle({ id: "my-bundle-id", count: 42 })];

    const result = buildCreditBundlesRequestBody(bundles);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("bundleId", "my-bundle-id");
    expect(result[0]).toHaveProperty("quantity", 42);
    expect(result[0]).not.toHaveProperty("id");
    expect(result[0]).not.toHaveProperty("count");
  });
});

describe("isScheduledCheckoutConflictMessage", () => {
  // Mirror the four 409 messages the API can emit (api/apps/errors/errors.go).
  // All four must trip the matcher so the UI shows the friendly "downgrade
  // pending" copy instead of the generic fallback.
  it.each([
    "a scheduled checkout already exists for this company",
    "cannot purchase add-ons while a scheduled downgrade is pending; cancel the scheduled downgrade first",
    "cannot purchase pay-in-advance entitlements while a scheduled downgrade is pending; cancel the scheduled downgrade first",
    "cannot purchase credits while a scheduled downgrade is pending; cancel the scheduled downgrade first",
  ])("matches the API conflict message: %s", (msg) => {
    expect(isScheduledCheckoutConflictMessage(msg)).toBe(true);
  });

  it("matches when the backend tweaks casing or surrounding wording", () => {
    expect(
      isScheduledCheckoutConflictMessage(
        "A Scheduled Checkout already exists.",
      ),
    ).toBe(true);
    expect(
      isScheduledCheckoutConflictMessage(
        "request blocked: scheduled downgrade pending",
      ),
    ).toBe(true);
  });

  it.each([
    "Invalid promo code",
    "self-service downgrade not permitted",
    "internal server error",
    "",
  ])("does not match unrelated message: %s", (msg) => {
    expect(isScheduledCheckoutConflictMessage(msg)).toBe(false);
  });

  it("returns false for non-string inputs", () => {
    expect(isScheduledCheckoutConflictMessage(undefined)).toBe(false);
    expect(isScheduledCheckoutConflictMessage(null)).toBe(false);
    expect(isScheduledCheckoutConflictMessage(409)).toBe(false);
    expect(
      isScheduledCheckoutConflictMessage({
        message: "scheduled downgrade pending",
      }),
    ).toBe(false);
  });
});
