import { describe, expect, it } from "vitest";

import {
  EntitlementPriceBehavior,
  type FeatureUsageResponseData,
} from "../checkoutexternal";
import {
  findTierForQuantity,
  getEntitlementCost,
  getEntitlementPrice,
  getPriceValue,
  getTierUnitPrice,
} from "./pricing";

function tier(overrides: {
  upTo?: number | null;
  perUnitPrice?: number | null;
  perUnitPriceDecimal?: string | null;
  flatAmount?: number | null;
}) {
  return {
    upTo: overrides.upTo ?? null,
    perUnitPrice: overrides.perUnitPrice ?? null,
    perUnitPriceDecimal: overrides.perUnitPriceDecimal ?? null,
    flatAmount: overrides.flatAmount ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function entitlement(
  overrides: Record<string, unknown>,
): FeatureUsageResponseData {
  return {
    access: true,
    allocationType: "numeric",
    entitlementId: "ent_1",
    entitlementType: "plan",
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("getTierUnitPrice", () => {
  it("prefers the decimal rate over the rounded integer", () => {
    expect(
      getTierUnitPrice(tier({ perUnitPrice: 0, perUnitPriceDecimal: "0.5" })),
    ).toBe(0.5);
    expect(getTierUnitPrice(tier({ perUnitPrice: 100 }))).toBe(100);
    expect(getTierUnitPrice(tier({}))).toBe(0);
  });

  it("falls back to the integer rate when the decimal is empty", () => {
    // Number("") is 0 — an empty decimal must not zero out a real rate.
    expect(
      getTierUnitPrice(tier({ perUnitPrice: 100, perUnitPriceDecimal: "" })),
    ).toBe(100);
  });
});

describe("getPriceValue", () => {
  it("prefers the decimal, falling back to price when it is null or empty", () => {
    expect(
      getPriceValue({ price: 100, priceDecimal: "0.5", currency: "usd" }),
    ).toBe(0.5);
    expect(
      getPriceValue({ price: 100, priceDecimal: null, currency: "usd" }),
    ).toBe(100);
    expect(
      getPriceValue({ price: 100, priceDecimal: "", currency: "usd" }),
    ).toBe(100);
    expect(
      getPriceValue({ price: 100, priceDecimal: "0", currency: "usd" }),
    ).toBe(0);
  });
});

describe("getEntitlementCost — overage", () => {
  it("charges sub-cent per-unit rates that only exist as a decimal", () => {
    // Stripe rounds perUnitPrice to 0 and carries the real rate in the decimal.
    const feature = entitlement({
      priceBehavior: EntitlementPriceBehavior.Overage,
      usage: 2_000_000,
      softLimit: 0,
      monthlyUsageBasedPrice: {
        price: 0,
        priceDecimal: "0",
        currency: "usd",
        priceTier: [
          tier({ upTo: 0 }),
          tier({ perUnitPrice: 0, perUnitPriceDecimal: "0.5" }),
        ],
      },
    });

    // 2M units over the limit at 0.5 cents each — not $0.00.
    expect(getEntitlementCost(feature, "month")).toBe(1_000_000);
  });

  it("still honors an integer per-unit rate and flat amount", () => {
    const feature = entitlement({
      priceBehavior: EntitlementPriceBehavior.Overage,
      usage: 150,
      softLimit: 100,
      monthlyUsageBasedPrice: {
        price: 0,
        currency: "usd",
        priceTier: [
          tier({ upTo: 100 }),
          tier({ perUnitPrice: 10, flatAmount: 500 }),
        ],
      },
    });

    expect(getEntitlementCost(feature, "month")).toBe(500 + 50 * 10);
  });

  it("charges nothing while usage is inside the included allotment", () => {
    // The overage tier's flat amount applies to the overage, not to merely
    // being on the plan: at 50 of 100 included units nothing is owed.
    const feature = entitlement({
      priceBehavior: EntitlementPriceBehavior.Overage,
      usage: 50,
      softLimit: 100,
      monthlyUsageBasedPrice: {
        price: 0,
        currency: "usd",
        priceTier: [
          tier({ upTo: 100 }),
          tier({ perUnitPrice: 10, flatAmount: 500 }),
        ],
      },
    });

    expect(getEntitlementCost(feature, "month")).toBeUndefined();
  });
});

describe("getEntitlementPrice — tiered realignment", () => {
  const tiers = [
    tier({ upTo: 100, perUnitPriceDecimal: "2" }),
    tier({ upTo: null, perUnitPriceDecimal: "1" }),
  ];

  it("substitutes the landing tier's rate for a Tier entitlement", () => {
    // The parent price on a tiered scheme is a stale 0.
    const inFirstTier = entitlement({
      priceBehavior: EntitlementPriceBehavior.Tier,
      usage: 50,
      monthlyUsageBasedPrice: {
        price: 0,
        priceDecimal: "0",
        currency: "usd",
        tiersMode: "graduated",
        priceTier: tiers,
      },
    });
    expect(getEntitlementPrice(inFirstTier, "month")?.price).toBe(2);

    const inSecondTier = entitlement({
      priceBehavior: EntitlementPriceBehavior.Tier,
      usage: 500,
      monthlyUsageBasedPrice: {
        price: 0,
        priceDecimal: "0",
        currency: "usd",
        tiersMode: "graduated",
        priceTier: tiers,
      },
    });
    expect(getEntitlementPrice(inSecondTier, "month")?.price).toBe(1);
  });

  it("substitutes the last tier's rate for an Overage entitlement", () => {
    const overage = entitlement({
      priceBehavior: EntitlementPriceBehavior.Overage,
      usage: 10,
      monthlyUsageBasedPrice: {
        price: 0,
        priceDecimal: "0",
        currency: "usd",
        priceTier: tiers,
      },
    });
    expect(getEntitlementPrice(overage, "month")?.price).toBe(1);
  });

  it("leaves non-tiered behaviors untouched", () => {
    const payAsYouGo = entitlement({
      priceBehavior: EntitlementPriceBehavior.PayAsYouGo,
      usage: 10,
      monthlyUsageBasedPrice: { price: 25, currency: "usd", priceTier: [] },
    });
    expect(getEntitlementPrice(payAsYouGo, "month")?.price).toBe(25);
  });
});

describe("findTierForQuantity", () => {
  const tiers = [tier({ upTo: 10 }), tier({ upTo: 100 }), tier({ upTo: null })];

  it("picks the band the quantity falls in", () => {
    expect(findTierForQuantity(tiers, 5)).toBe(tiers[0]);
    expect(findTierForQuantity(tiers, 10)).toBe(tiers[0]);
    expect(findTierForQuantity(tiers, 11)).toBe(tiers[1]);
    expect(findTierForQuantity(tiers, 100)).toBe(tiers[1]);
    expect(findTierForQuantity(tiers, 5000)).toBe(tiers[2]);
  });
});
