import type {
  BillingPriceView,
  BillingProductPriceTierResponseData,
  FeatureResponseData,
  PlanEntitlementResponseData,
} from "../../../api/checkoutexternal";
import { PriceBehavior } from "../../../const";

import { extractOverageInfo, findOverageEntitlement } from "./helpers";

describe("findOverageEntitlement", () => {
  it("should return undefined when entitlements is undefined", () => {
    const result = findOverageEntitlement(undefined);
    expect(result).toBeUndefined();
  });

  it("should return undefined when entitlements is empty", () => {
    const result = findOverageEntitlement([]);
    expect(result).toBeUndefined();
  });

  it("should return undefined when no overage entitlements exist", () => {
    const entitlements: Partial<PlanEntitlementResponseData>[] = [
      {
        id: "ent1",
        priceBehavior: PriceBehavior.PayInAdvance,
      },
      {
        id: "ent2",
        priceBehavior: PriceBehavior.PayAsYouGo,
      },
    ];

    const result = findOverageEntitlement(
      entitlements as PlanEntitlementResponseData[],
    );
    expect(result).toBeUndefined();
  });

  it("should return the overage entitlement when it exists", () => {
    const overageEntitlement: Partial<PlanEntitlementResponseData> = {
      id: "overage-ent",
      priceBehavior: PriceBehavior.Overage,
    };

    const entitlements: Partial<PlanEntitlementResponseData>[] = [
      {
        id: "ent1",
        priceBehavior: PriceBehavior.PayInAdvance,
      },
      overageEntitlement,
      {
        id: "ent2",
        priceBehavior: PriceBehavior.PayAsYouGo,
      },
    ];

    const result = findOverageEntitlement(
      entitlements as PlanEntitlementResponseData[],
    );
    expect(result).toBe(overageEntitlement);
  });

  it("should return the first overage entitlement when multiple exist", () => {
    const firstOverage: Partial<PlanEntitlementResponseData> = {
      id: "overage-ent-1",
      priceBehavior: PriceBehavior.Overage,
    };

    const entitlements: Partial<PlanEntitlementResponseData>[] = [
      firstOverage,
      {
        id: "overage-ent-2",
        priceBehavior: PriceBehavior.Overage,
      },
    ];

    const result = findOverageEntitlement(
      entitlements as PlanEntitlementResponseData[],
    );
    expect(result).toBe(firstOverage);
  });
});

describe("extractOverageInfo", () => {
  it("should return null when overageEntitlement is undefined", () => {
    const result = extractOverageInfo(undefined, "month");
    expect(result).toBeNull();
  });

  it("should return null when price data is missing", () => {
    const entitlement: Partial<PlanEntitlementResponseData> = {
      id: "ent1",
      priceBehavior: PriceBehavior.Overage,
      meteredMonthlyPrice: undefined,
      meteredYearlyPrice: undefined,
    };

    const result = extractOverageInfo(
      entitlement as PlanEntitlementResponseData,
      "month",
    );
    expect(result).toBeNull();
  });

  it("should return null when price tiers are missing", () => {
    const entitlement: Partial<PlanEntitlementResponseData> = {
      id: "ent1",
      priceBehavior: PriceBehavior.Overage,
      meteredMonthlyPrice: {
        priceTier: [],
        currency: "USD",
      } as unknown as BillingPriceView,
    };

    const result = extractOverageInfo(
      entitlement as PlanEntitlementResponseData,
      "month",
    );
    expect(result).toBeNull();
  });

  it("should return null when there are fewer than 2 price tiers", () => {
    const entitlement: Partial<PlanEntitlementResponseData> = {
      id: "ent1",
      priceBehavior: PriceBehavior.Overage,
      meteredMonthlyPrice: {
        priceTier: [
          {
            perUnitPrice: 10,
          } as BillingProductPriceTierResponseData,
        ],
        currency: "USD",
      } as unknown as BillingPriceView,
    };

    const result = extractOverageInfo(
      entitlement as PlanEntitlementResponseData,
      "month",
    );
    expect(result).toBeNull();
  });

  it("should extract overage info from monthly price for month period", () => {
    const entitlement: Partial<PlanEntitlementResponseData> = {
      id: "ent1",
      priceBehavior: PriceBehavior.Overage,
      softLimit: 100,
      feature: {
        name: "API Calls",
      } as FeatureResponseData,
      meteredMonthlyPrice: {
        priceTier: [
          {
            perUnitPrice: 0,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPrice: 5,
            perUnitPriceDecimal: "5.50",
          } as BillingProductPriceTierResponseData,
        ],
        currency: "USD",
      } as unknown as BillingPriceView,
      meteredYearlyPrice: {
        priceTier: [
          {
            perUnitPrice: 0,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPrice: 50,
          } as BillingProductPriceTierResponseData,
        ],
        currency: "USD",
      } as unknown as BillingPriceView,
    };

    const result = extractOverageInfo(
      entitlement as PlanEntitlementResponseData,
      "month",
    );
    expect(result).toEqual({
      softLimit: 100,
      perUnitPrice: 5.5,
      currency: "USD",
      featureName: "API Calls",
    });
  });

  it("should extract overage info from yearly price for year period", () => {
    const entitlement: Partial<PlanEntitlementResponseData> = {
      id: "ent1",
      priceBehavior: PriceBehavior.Overage,
      softLimit: 1000,
      feature: {
        name: "Storage GB",
      } as FeatureResponseData,
      meteredMonthlyPrice: {
        priceTier: [
          {
            perUnitPrice: 0,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPrice: 5,
          } as BillingProductPriceTierResponseData,
        ],
        currency: "USD",
      } as unknown as BillingPriceView,
      meteredYearlyPrice: {
        priceTier: [
          {
            perUnitPrice: 0,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPriceDecimal: "48.99",
          } as BillingProductPriceTierResponseData,
        ],
        currency: "EUR",
      } as unknown as BillingPriceView,
    };

    const result = extractOverageInfo(
      entitlement as PlanEntitlementResponseData,
      "year",
    );
    expect(result).toEqual({
      softLimit: 1000,
      perUnitPrice: 48.99,
      currency: "EUR",
      featureName: "Storage GB",
    });
  });

  it("should use perUnitPrice when perUnitPriceDecimal is not available", () => {
    const entitlement: Partial<PlanEntitlementResponseData> = {
      id: "ent1",
      priceBehavior: PriceBehavior.Overage,
      softLimit: 50,
      meteredMonthlyPrice: {
        priceTier: [
          {
            perUnitPrice: 0,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPrice: 10,
            perUnitPriceDecimal: null,
          } as BillingProductPriceTierResponseData,
        ],
        currency: "USD",
      } as unknown as BillingPriceView,
    };

    const result = extractOverageInfo(
      entitlement as PlanEntitlementResponseData,
      "month",
    );
    expect(result).toEqual({
      softLimit: 50,
      perUnitPrice: 10,
      currency: "USD",
      featureName: undefined,
    });
  });

  it("should use fallback currency when price data currency is missing", () => {
    const entitlement: Partial<PlanEntitlementResponseData> = {
      id: "ent1",
      priceBehavior: PriceBehavior.Overage,
      softLimit: null,
      meteredMonthlyPrice: {
        priceTier: [
          {
            perUnitPrice: 0,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPrice: 15,
          } as BillingProductPriceTierResponseData,
        ],
        currency: undefined,
      } as unknown as BillingPriceView,
    };

    const result = extractOverageInfo(
      entitlement as PlanEntitlementResponseData,
      "month",
      "GBP",
    );
    expect(result).toEqual({
      softLimit: null,
      perUnitPrice: 15,
      currency: "GBP",
      featureName: undefined,
    });
  });

  it("should default to USD when both currency and fallback are missing", () => {
    const entitlement: Partial<PlanEntitlementResponseData> = {
      id: "ent1",
      priceBehavior: PriceBehavior.Overage,
      meteredMonthlyPrice: {
        priceTier: [
          {
            perUnitPrice: 0,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPrice: 20,
          } as BillingProductPriceTierResponseData,
        ],
        currency: undefined,
      } as unknown as BillingPriceView,
    };

    const result = extractOverageInfo(
      entitlement as PlanEntitlementResponseData,
      "month",
    );
    expect(result).toEqual({
      softLimit: undefined,
      perUnitPrice: 20,
      currency: "USD",
      featureName: undefined,
    });
  });

  it("should use 0 as perUnitPrice when tier price is missing", () => {
    const entitlement: Partial<PlanEntitlementResponseData> = {
      id: "ent1",
      priceBehavior: PriceBehavior.Overage,
      softLimit: 200,
      meteredMonthlyPrice: {
        priceTier: [
          {
            perUnitPrice: 0,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPrice: null,
            perUnitPriceDecimal: null,
          } as BillingProductPriceTierResponseData,
        ],
        currency: "USD",
      } as unknown as BillingPriceView,
    };

    const result = extractOverageInfo(
      entitlement as PlanEntitlementResponseData,
      "month",
    );
    expect(result).toEqual({
      softLimit: 200,
      perUnitPrice: 0,
      currency: "USD",
      featureName: undefined,
    });
  });

  it("should extract from the last tier when multiple tiers exist", () => {
    const entitlement: Partial<PlanEntitlementResponseData> = {
      id: "ent1",
      priceBehavior: PriceBehavior.Overage,
      softLimit: 500,
      feature: {
        name: "Requests",
      } as FeatureResponseData,
      meteredMonthlyPrice: {
        priceTier: [
          {
            perUnitPrice: 0,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPrice: 1,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPrice: 2,
          } as BillingProductPriceTierResponseData,
          {
            perUnitPrice: 3,
            perUnitPriceDecimal: "3.75",
          } as BillingProductPriceTierResponseData,
        ],
        currency: "USD",
      } as unknown as BillingPriceView,
    };

    const result = extractOverageInfo(
      entitlement as PlanEntitlementResponseData,
      "month",
    );
    expect(result).toEqual({
      softLimit: 500,
      perUnitPrice: 3.75,
      currency: "USD",
      featureName: "Requests",
    });
  });
});