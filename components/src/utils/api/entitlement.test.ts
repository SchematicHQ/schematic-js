import type {
  BillingPriceView,
  FeatureDetailResponseData,
  FeatureUsageResponseData,
} from "../../api/checkoutexternal";
import { FeatureUsageResponseDataAllocationTypeEnum } from "../../api/checkoutexternal";
import { extractCurrentUsageBasedEntitlements } from "../index";

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
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent1",
        entitlementType: "boolean",
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
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent1",
        entitlementType: "boolean",
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
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent1",
        entitlementType: "boolean",
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
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent1",
        entitlementType: "boolean",
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
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent1",
        entitlementType: "boolean",
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
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent1",
        entitlementType: "boolean",
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
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent1",
        entitlementType: "boolean",
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
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent1",
        entitlementType: "boolean",
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
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent2",
        entitlementType: "boolean",
        allocation: null,
        usage: null,
        priceBehavior: null,
        monthlyUsageBasedPrice: undefined,
      },
      {
        access: true,
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent3",
        entitlementType: "boolean",
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
        allocationType: FeatureUsageResponseDataAllocationTypeEnum.Numeric,
        entitlementId: "ent1",
        entitlementType: "boolean",
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
      entitlementType: "boolean",
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
