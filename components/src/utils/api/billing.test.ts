import type {
  BillingPriceView,
  EntitlementCurrencyPricesResponseData,
  PlanEntitlementResponseData,
} from "../../api/checkoutexternal";
import {
  EntitlementPriceBehavior,
  EntitlementValueType,
} from "../../api/checkoutexternal";

import { getEntitlementPrice } from "./billing";

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
  });
});
