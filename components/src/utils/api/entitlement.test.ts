import type {
  BillingPriceView,
  FeatureDetailResponseData,
  FeatureUsageResponseData,
} from "../../api/checkoutexternal";
import {
  EntitlementType,
  EntitlementValueType,
} from "../../api/checkoutexternal";
import {
  extractCurrentUsageBasedEntitlements,
  getEntitlementFeatureName,
  getUsageDetails,
} from "../index";

describe("calculateCurrentUsageBasedEntitlements", () => {
  it("should return an empty array when features is undefined", () => {
    const result = extractCurrentUsageBasedEntitlements(undefined, "month");
    expect(result).toEqual([]);
  });

  it("should return an empty array when features is an empty array", () => {
    const result = extractCurrentUsageBasedEntitlements([], "month");
    expect(result).toEqual([]);
  });

  it("should filter out features without priceBehavior", () => {
    const features: Array<FeatureUsageResponseData> = [
      {
        access: true,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent1",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: 10,
        usage: 5,
        priceBehavior: null,
        monthlyUsageBasedPrice: {
          price: 100,
          priceId: "price1",
          currency: "USD",
        } as BillingPriceView,
      },
    ];

    const result = extractCurrentUsageBasedEntitlements(features, "month");
    expect(result).toEqual([]);
  });

  it("should include features with priceBehavior and monthly price for month period", () => {
    const features: Array<FeatureUsageResponseData> = [
      {
        access: true,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent1",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: 10,
        usage: 5,
        priceBehavior: "pay_in_advance",
        monthlyUsageBasedPrice: {
          price: 100,
          priceId: "price1",
          currency: "USD",
        } as BillingPriceView,
      },
    ];

    const result = extractCurrentUsageBasedEntitlements(features, "month");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      allocation: 10,
      usage: 5,
      quantity: 10,
      priceBehavior: "pay_in_advance",
    });
  });

  it("should include features with priceBehavior and yearly price for year period", () => {
    const features: Array<FeatureUsageResponseData> = [
      {
        access: true,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent1",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: 15,
        usage: 8,
        priceBehavior: "pay_as_you_go",
        yearlyUsageBasedPrice: {
          price: 1000,
          priceId: "price2",
          currency: "USD",
        } as BillingPriceView,
      },
    ];

    const result = extractCurrentUsageBasedEntitlements(features, "year");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      allocation: 15,
      usage: 8,
      quantity: 15,
      priceBehavior: "pay_as_you_go",
    });
  });

  it("should exclude features without matching price for the period", () => {
    const features: Array<FeatureUsageResponseData> = [
      {
        access: true,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent1",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: 10,
        usage: 5,
        priceBehavior: "pay_in_advance",
        yearlyUsageBasedPrice: {
          price: 1000,
          priceId: "price1",
          currency: "USD",
        } as BillingPriceView,
      },
    ];

    const result = extractCurrentUsageBasedEntitlements(features, "month");
    expect(result).toEqual([]);
  });

  it("should handle null allocation and usage values", () => {
    const features: Array<FeatureUsageResponseData> = [
      {
        access: true,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent1",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: null,
        usage: null,
        priceBehavior: "pay_in_advance",
        monthlyUsageBasedPrice: {
          price: 100,
          priceId: "price1",
          currency: "USD",
        } as BillingPriceView,
      },
    ];

    const result = extractCurrentUsageBasedEntitlements(features, "month");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      allocation: 0,
      usage: 0,
      quantity: 0,
    });
  });

  it("should use allocation for quantity when allocation is present", () => {
    const features: Array<FeatureUsageResponseData> = [
      {
        access: true,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent1",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: 20,
        usage: 5,
        priceBehavior: "pay_in_advance",
        monthlyUsageBasedPrice: {
          price: 100,
          priceId: "price1",
          currency: "USD",
        } as BillingPriceView,
      },
    ];

    const result = extractCurrentUsageBasedEntitlements(features, "month");
    expect(result[0].quantity).toBe(20);
  });

  it("should use usage for quantity when allocation is 0", () => {
    const features: Array<FeatureUsageResponseData> = [
      {
        access: true,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent1",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: 0,
        usage: 15,
        priceBehavior: "pay_as_you_go",
        monthlyUsageBasedPrice: {
          price: 100,
          priceId: "price1",
          currency: "USD",
        } as BillingPriceView,
      },
    ];

    const result = extractCurrentUsageBasedEntitlements(features, "month");
    expect(result[0].quantity).toBe(0);
  });

  it("should process multiple features correctly", () => {
    const features: Array<FeatureUsageResponseData> = [
      {
        access: true,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent1",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: 10,
        usage: 5,
        priceBehavior: "pay_in_advance",
        monthlyUsageBasedPrice: {
          price: 100,
          priceId: "price1",
          currency: "USD",
        } as BillingPriceView,
      },
      {
        access: false,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent2",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: null,
        usage: null,
        priceBehavior: null,
        monthlyUsageBasedPrice: undefined,
      },
      {
        access: true,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent3",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: 20,
        usage: 15,
        priceBehavior: "pay_as_you_go",
        yearlyUsageBasedPrice: {
          price: 2000,
          priceId: "price3",
          currency: "USD",
        } as BillingPriceView,
      },
    ];

    const monthResult = extractCurrentUsageBasedEntitlements(features, "month");
    expect(monthResult).toHaveLength(1);
    expect(monthResult[0].entitlementId).toBe("ent1");

    const yearResult = extractCurrentUsageBasedEntitlements(features, "year");
    expect(yearResult).toHaveLength(1);
    expect(yearResult[0].entitlementId).toBe("ent3");
  });

  it("should preserve all properties from the original entitlement", () => {
    const features: Array<FeatureUsageResponseData> = [
      {
        access: true,
        allocationType: EntitlementValueType.Numeric,
        entitlementId: "ent1",
        entitlementType: EntitlementType.PlanEntitlement,
        allocation: 10,
        usage: 5,
        priceBehavior: "pay_in_advance",
        monthlyUsageBasedPrice: {
          price: 100,
          priceId: "price1",
          currency: "USD",
        } as BillingPriceView,
        feature: {
          id: "feat1",
          name: "Feature 1",
        } as FeatureDetailResponseData,
        period: "month",
      },
    ];

    const result = extractCurrentUsageBasedEntitlements(features, "month");
    expect(result[0]).toMatchObject({
      access: true,
      allocationType: "numeric",
      entitlementId: "ent1",
      entitlementType: "plan_entitlement",
      allocation: 10,
      usage: 5,
      quantity: 10,
      priceBehavior: "pay_in_advance",
      feature: {
        id: "feat1",
        name: "Feature 1",
      },
      period: "month",
    });
  });
});

describe("getEntitlementFeatureName", () => {
  it("should return feature.pluralName when available", () => {
    const entitlement = {
      feature: {
        pluralName: "Users",
        name: "User",
      },
      featureName: "FallbackName",
    };

    const result = getEntitlementFeatureName(entitlement);
    expect(result).toBe("Users");
  });

  it("should return feature.name when pluralName is not available", () => {
    const entitlement = {
      feature: {
        name: "User",
      },
      featureName: "FallbackName",
    };

    const result = getEntitlementFeatureName(entitlement);
    expect(result).toBe("User");
  });

  it("should return featureName when feature properties are not available", () => {
    const entitlement = {
      feature: {},
      featureName: "FallbackName",
    };

    const result = getEntitlementFeatureName(entitlement);
    expect(result).toBe("FallbackName");
  });

  it("should return defaultValue when no feature information is available", () => {
    const entitlement = {
      feature: {},
    };

    const result = getEntitlementFeatureName(entitlement, "units");
    expect(result).toBe("units");
  });

  it("should return empty string when no information and no default value", () => {
    const entitlement = {
      feature: {},
    };

    const result = getEntitlementFeatureName(entitlement);
    expect(result).toBe("");
  });

  it("should handle null values in feature properties", () => {
    const entitlement = {
      feature: {
        pluralName: null,
        name: null,
      },
      featureName: null,
    };

    const result = getEntitlementFeatureName(entitlement, "default");
    expect(result).toBe("default");
  });

  it("should handle undefined feature object", () => {
    const entitlement = {
      featureName: "MyFeature",
    };

    const result = getEntitlementFeatureName(entitlement);
    expect(result).toBe("MyFeature");
  });

  it("should prioritize pluralName over name and featureName", () => {
    const entitlement = {
      feature: {
        pluralName: "Seats",
        name: "Seat",
      },
      featureName: "LicenseSeats",
    };

    const result = getEntitlementFeatureName(entitlement);
    expect(result).toBe("Seats");
  });

  it("should prioritize name over featureName when pluralName is missing", () => {
    const entitlement = {
      feature: {
        name: "Seat",
      },
      featureName: "LicenseSeats",
    };

    const result = getEntitlementFeatureName(entitlement);
    expect(result).toBe("Seat");
  });
});

// Helper to create a minimal FeatureUsageResponseData with overrides
function makeEntitlement(
  overrides: Partial<FeatureUsageResponseData> = {},
): FeatureUsageResponseData {
  return {
    access: true,
    allocationType: EntitlementValueType.Numeric,
    entitlementId: "ent-1",
    entitlementType: EntitlementType.PlanEntitlement,
    ...overrides,
  };
}

describe("getUsageDetails", () => {
  describe("limit", () => {
    it("should use allocation for pay-in-advance", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "pay_in_advance",
          allocation: 100,
          usage: 40,
        }),
      );
      expect(result.limit).toBe(100);
    });

    it("should use softLimit for overage pricing", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "overage",
          softLimit: 10,
          usage: 7,
        }),
      );
      expect(result.limit).toBe(10);
    });

    it("should use creditTotal / creditConsumptionRate for credit pricing", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "credit_burndown",
          creditTotal: 1000,
          creditConsumptionRate: 5,
        }),
      );
      expect(result.limit).toBe(200);
    });

    it("should use allocation when no price behavior", () => {
      const result = getUsageDetails(
        makeEntitlement({ allocation: 50, usage: 10 }),
      );
      expect(result.limit).toBe(50);
    });

    it("should be undefined for pay-as-you-go", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "pay_as_you_go",
          usage: 25,
        }),
      );
      expect(result.limit).toBeUndefined();
    });
  });

  describe("amount", () => {
    it("should use allocation for pay-in-advance", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "pay_in_advance",
          allocation: 100,
        }),
      );
      expect(result.amount).toBe(100);
    });

    it("should use usage for pay-as-you-go", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "pay_as_you_go",
          usage: 42,
        }),
      );
      expect(result.amount).toBe(42);
    });

    it("should use usage for tiered pricing", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "tier",
          usage: 75,
        }),
      );
      expect(result.amount).toBe(75);
    });

    it("should compute overage amount as usage - softLimit", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "overage",
          usage: 7,
          softLimit: 1,
        }),
      );
      expect(result.amount).toBe(6);
    });

    it("should clamp overage amount to 0 when under soft limit", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "overage",
          usage: 0,
          softLimit: 10,
        }),
      );
      expect(result.amount).toBe(0);
    });

    it("should compute credit amount as creditUsed / consumptionRate", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "credit_burndown",
          creditUsed: 50,
          creditConsumptionRate: 5,
        }),
      );
      expect(result.amount).toBe(10);
    });
  });

  describe("currentTier", () => {
    it("should resolve overage tier from billing price tiers", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "overage",
          softLimit: 100,
          usage: 150,
          monthlyUsageBasedPrice: {
            priceId: "p1",
            price: 10,
            priceTier: [
              { upTo: 100, perUnitPrice: 0 },
              { upTo: null, perUnitPrice: 5 },
            ],
          } as BillingPriceView,
        }),
        "month",
      );
      expect(result.currentTier).toMatchObject({
        from: 101,
        to: Infinity,
        perUnitPrice: 5,
      });
    });

    it("should resolve tiered pricing current tier based on usage", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "tier",
          usage: 150,
          monthlyUsageBasedPrice: {
            priceId: "p1",
            price: 10,
            priceTier: [
              { upTo: 100, perUnitPrice: 10 },
              { upTo: 500, perUnitPrice: 5 },
              { upTo: null, perUnitPrice: 2 },
            ],
          } as BillingPriceView,
        }),
        "month",
      );
      expect(result.currentTier).toMatchObject({
        from: 101,
        to: 500,
        perUnitPrice: 5,
      });
    });

    it("should be undefined when no tiers exist", () => {
      const result = getUsageDetails(
        makeEntitlement({
          priceBehavior: "overage",
          softLimit: 10,
          usage: 15,
        }),
      );
      expect(result.currentTier).toBeUndefined();
    });
  });

  describe("billingPrice", () => {
    const monthlyPrice = {
      priceId: "monthly",
      price: 10,
    } as BillingPriceView;
    const yearlyPrice = {
      priceId: "yearly",
      price: 100,
    } as BillingPriceView;

    it("should select monthly price for month period", () => {
      const result = getUsageDetails(
        makeEntitlement({
          monthlyUsageBasedPrice: monthlyPrice,
          yearlyUsageBasedPrice: yearlyPrice,
        }),
        "month",
      );
      expect(result.billingPrice?.priceId).toBe("monthly");
    });

    it("should select yearly price for year period", () => {
      const result = getUsageDetails(
        makeEntitlement({
          monthlyUsageBasedPrice: monthlyPrice,
          yearlyUsageBasedPrice: yearlyPrice,
        }),
        "year",
      );
      expect(result.billingPrice?.priceId).toBe("yearly");
    });

    it("should be undefined when no period provided", () => {
      const result = getUsageDetails(
        makeEntitlement({
          monthlyUsageBasedPrice: monthlyPrice,
        }),
      );
      expect(result.billingPrice).toBeUndefined();
    });
  });
});
