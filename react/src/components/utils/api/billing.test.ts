import type {
  BillingPriceView,
  EntitlementCurrencyPricesResponseData,
  PlanEntitlementResponseData,
} from "../../api/checkoutexternal";
import {
  EntitlementPriceBehavior,
  EntitlementValueType,
} from "../../api/checkoutexternal";

import type { Plan } from "../../types";

import { getEntitlementPrice, planOffersCurrencyForPeriod } from "./billing";

// Minimal plan priced monthly+yearly in USD (legacy fields) but only yearly in
// EUR (currencyPrices). Exercises the silent-fallback path getPlanPrice takes
// when a currency lacks the requested period.
function makeCurrencyPlan(): Plan {
  const usd = (price: number) => ({ currency: "USD", price });
  const eur = (price: number) => ({ currency: "EUR", price });

  return {
    id: "plan-1",
    monthlyPrice: usd(1000),
    yearlyPrice: usd(10000),
    currencyPrices: [
      { currency: "EUR", yearlyPrice: eur(9000) },
      { currency: "USD", monthlyPrice: usd(1000), yearlyPrice: usd(10000) },
    ],
  } as unknown as Plan;
}

describe("planOffersCurrencyForPeriod", () => {
  it("returns true when no currency is requested", () => {
    expect(planOffersCurrencyForPeriod(makeCurrencyPlan(), "month")).toBe(true);
  });

  it("returns true when the currency prices the requested period", () => {
    expect(planOffersCurrencyForPeriod(makeCurrencyPlan(), "year", "EUR")).toBe(
      true,
    );
  });

  it("returns false when the currency lacks the requested period (would fall back)", () => {
    // EUR has no monthly price; getPlanPrice would return the USD monthly price.
    expect(
      planOffersCurrencyForPeriod(makeCurrencyPlan(), "month", "EUR"),
    ).toBe(false);
  });

  it("is case-insensitive about the currency code", () => {
    expect(planOffersCurrencyForPeriod(makeCurrencyPlan(), "year", "eur")).toBe(
      true,
    );
  });

  it("returns true for a free/unpriced plan (nothing to mischarge)", () => {
    const freePlan = { id: "free", currencyPrices: [] } as unknown as Plan;
    expect(planOffersCurrencyForPeriod(freePlan, "month", "EUR")).toBe(true);
  });
});

// Build a tiered Overage BillingPriceView whose parent `price` is 0 and the
// per-unit cost lives in the highest priceTier entry. This mirrors what the
// API returns for Stripe-imported tiered/graduated prices.
function makeTieredOveragePriceView(
  perUnitPrice: number,
  overrides: Partial<BillingPriceView> = {},
): BillingPriceView {
  return {
    price: 0,
    priceDecimal: undefined,
    currency: "USD",
    packageSize: 1,
    priceTier: [
      { upTo: 2800, perUnitPrice: 0, perUnitPriceDecimal: undefined },
      { upTo: null, perUnitPrice, perUnitPriceDecimal: undefined },
    ],
    ...overrides,
  } as unknown as BillingPriceView;
}

function makeOverageEntitlement(
  overrides: Partial<PlanEntitlementResponseData> = {},
): PlanEntitlementResponseData {
  return {
    createdAt: new Date(),
    currencyPrices: [],
    environmentId: "env-1",
    featureId: "feat-1",
    id: "ent-1",
    planId: "plan-1",
    ruleId: "rule-1",
    updatedAt: new Date(),
    valueType: EntitlementValueType.Numeric,
    priceBehavior: EntitlementPriceBehavior.Overage,
    softLimit: 2800,
    ...overrides,
  } as PlanEntitlementResponseData;
}

describe("getEntitlementPrice", () => {
  describe("Overage tiered pricing", () => {
    // Regression test for SCHY-269: when an account has an active subscription,
    // useSubscriptionCurrency() pins `currency` to "USD", which previously caused
    // getEntitlementPrice to return early in the currencyPrices branch without
    // applying the Overage tier extraction. The result was a $0.00 overage price
    // displayed in the checkout sidebar for tiered Overage entitlements that
    // had multi-currency prices populated.
    it("extracts the per-unit price from the highest tier when reading from currencyPrices", () => {
      const entitlement = makeOverageEntitlement({
        currencyPrices: [
          {
            currency: "USD",
            monthlyPrice: makeTieredOveragePriceView(9),
          } as EntitlementCurrencyPricesResponseData,
        ],
      });

      const result = getEntitlementPrice(entitlement, "month", "USD");
      expect(result?.price).toBe(9);
    });

    it("extracts the per-unit price from the highest tier when reading from meteredMonthlyPrice", () => {
      const entitlement = makeOverageEntitlement({
        meteredMonthlyPrice: makeTieredOveragePriceView(9),
      });

      const result = getEntitlementPrice(entitlement, "month");
      expect(result?.price).toBe(9);
    });

    it("extracts the per-unit price from the highest tier when reading from meteredYearlyPrice", () => {
      const entitlement = makeOverageEntitlement({
        meteredYearlyPrice: makeTieredOveragePriceView(108),
      });

      const result = getEntitlementPrice(entitlement, "year");
      expect(result?.price).toBe(108);
    });

    it("does not let a stale parent priceDecimal mask the overage tier price", () => {
      // Some tiered prices have priceDecimal: "0" on the parent BillingPriceView
      // because the base scheme is free below the soft limit. getPriceValue
      // would otherwise prefer that "0" over the overridden price field.
      const entitlement = makeOverageEntitlement({
        meteredMonthlyPrice: makeTieredOveragePriceView(9, {
          priceDecimal: "0",
        }),
      });

      const result = getEntitlementPrice(entitlement, "month");
      expect(result?.price).toBe(9);
    });

    it("falls back to meteredMonthlyPrice when no currencyPrices match the requested currency", () => {
      const entitlement = makeOverageEntitlement({
        currencyPrices: [
          {
            currency: "EUR",
            monthlyPrice: makeTieredOveragePriceView(8),
          } as EntitlementCurrencyPricesResponseData,
        ],
        meteredMonthlyPrice: makeTieredOveragePriceView(9),
      });

      const result = getEntitlementPrice(entitlement, "month", "USD");
      expect(result?.price).toBe(9);
    });

    it("extracts the per-unit price from the highest tier when reading from meteredQuarterlyPrice", () => {
      const entitlement = makeOverageEntitlement({
        meteredQuarterlyPrice: makeTieredOveragePriceView(27),
      });

      const result = getEntitlementPrice(entitlement, "quarter");
      expect(result?.price).toBe(27);
    });

    it("reads the quarterly currency price when it is provided", () => {
      const entitlement = makeOverageEntitlement({
        currencyPrices: [
          {
            currency: "USD",
            quarterlyPrice: makeTieredOveragePriceView(27),
          } as EntitlementCurrencyPricesResponseData,
        ],
      });

      const result = getEntitlementPrice(entitlement, "quarter", "USD");
      expect(result?.price).toBe(27);
    });
  });
});
