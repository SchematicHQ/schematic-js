import { featureUsage, meteredPrice } from "../fixtures/builders";

import {
  currentTier,
  isTieredPrice,
  pricePeriod,
  tierRanges,
  unitPrice,
  usageLimit,
} from "./featureUsage";

const twoTiers = meteredPrice({
  scheme: "tiered",
  priceTiers: [
    { from: 0, to: 100, perUnitPrice: 0 },
    { from: 101, perUnitPrice: 5, perUnitPriceDecimal: "4.5", flatPrice: 200 },
  ],
});

describe("pricePeriod", () => {
  test("reads a three-month interval as a quarter", () => {
    expect(pricePeriod(meteredPrice({ intervalCount: 3 }))).toBe("quarter");
    expect(pricePeriod(meteredPrice({ interval: "year" }))).toBe("year");
    expect(pricePeriod(meteredPrice())).toBe("month");
    expect(pricePeriod(undefined)).toBeNull();
  });
});

describe("isTieredPrice", () => {
  test("is tiered with several tiers or a tiers mode", () => {
    expect(isTieredPrice(twoTiers)).toBe(true);
    expect(isTieredPrice(meteredPrice({ tiersMode: "volume" }))).toBe(true);
    expect(isTieredPrice(meteredPrice())).toBe(false);
    expect(isTieredPrice(undefined)).toBe(false);
  });
});

describe("unitPrice", () => {
  test("prefers the provider's decimal", () => {
    expect(unitPrice(meteredPrice({ price: 1, priceDecimal: "0.5" }))).toBe(
      0.5,
    );
    expect(unitPrice(meteredPrice({ price: 3 }))).toBe(3);
  });
});

describe("usageLimit", () => {
  test("is the allocation, or the soft limit for overage", () => {
    expect(usageLimit(featureUsage({ allocation: 10 }))).toBe(10);
    expect(
      usageLimit(
        featureUsage({ allocation: 10, priceBehavior: "pay_in_advance" }),
      ),
    ).toBe(10);
    expect(
      usageLimit(featureUsage({ priceBehavior: "overage", softLimit: 7 })),
    ).toBe(7);
    expect(
      usageLimit(featureUsage({ priceBehavior: "pay_as_you_go" })),
    ).toBeNull();
  });

  test("is the warning threshold when asked for and configured", () => {
    const row = featureUsage({ allocation: 10, warningThreshold: 8 });
    expect(usageLimit(row)).toBe(10);
    expect(usageLimit(row, { showWarningThresholdAsLimit: true })).toBe(8);
    expect(
      usageLimit(featureUsage({ allocation: 10 }), {
        showWarningThresholdAsLimit: true,
      }),
    ).toBe(10);
  });
});

describe("currentTier", () => {
  test("overage is the tier past the soft limit of a two-tier price", () => {
    expect(
      currentTier(
        featureUsage({
          priceBehavior: "overage",
          softLimit: 100,
          price: twoTiers,
        }),
      ),
    ).toEqual({ from: 101, to: null, flatPrice: 200, perUnitPrice: 4.5 });
    expect(
      currentTier(
        featureUsage({
          priceBehavior: "overage",
          softLimit: 100,
          price: meteredPrice(),
        }),
      ),
    ).toBeNull();
  });

  test("tier pricing is the tier holding the usage", () => {
    const row = (usage: number) =>
      featureUsage({ priceBehavior: "tier", usage, price: twoTiers });
    expect(currentTier(row(40))).toMatchObject({ from: 0, to: 100 });
    expect(currentTier(row(500))).toMatchObject({ from: 101, to: null });
  });
});

describe("tierRanges", () => {
  test("starts the first tier at one unit", () => {
    expect(tierRanges(twoTiers).map((t) => [t.from, t.to])).toEqual([
      [1, 100],
      [101, null],
    ]);
    expect(tierRanges(undefined)).toEqual([]);
  });
});
