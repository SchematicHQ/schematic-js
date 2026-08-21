import { describe, expect, it } from "vitest";

import { EntitlementPriceBehavior, EntitlementValueType } from "../api/public";

import { deriveEntitlement } from "./entitlements";
import { entitlement, price } from "./fixtures";
import { PricePeriod } from "./period";

describe("deriveEntitlement", () => {
  it("renders a priced row for pay-in-advance with a unit price", () => {
    const row = deriveEntitlement(
      entitlement({
        priceBehavior: EntitlementPriceBehavior.PayInAdvance,
        meteredMonthlyPrice: price({
          price: 500,
          period: PricePeriod.Month,
        }),
        valueNumeric: 3,
      }),
      { period: PricePeriod.Month, locale: "en-US" },
    );
    expect(row.kind).toBe("priced");
    expect(row.price?.formatted).toBe("$5.00");
    expect(row.limit).toBe(3);
    expect(row.featureLabel).toBe("Seats");
  });

  it("renders a tiered row when the price carries tiers", () => {
    const row = deriveEntitlement(
      entitlement({
        priceBehavior: EntitlementPriceBehavior.Tier,
        meteredMonthlyPrice: price({
          price: 0,
          period: PricePeriod.Month,
          tiersMode: "graduated",
          priceTiers: [
            { from: 0, to: 10, perUnitPrice: 100 },
            { from: 11, perUnitPrice: 50 },
          ],
        }),
      }),
      { period: PricePeriod.Month, locale: "en-US" },
    );
    expect(row.kind).toBe("tiered");
    expect(row.price?.tiers).toHaveLength(2);
    expect(row.price?.tiers?.[0]).toMatchObject({ from: 0, to: 10 });
    expect(row.price?.tiers?.[1].to).toBeUndefined();
    expect(row.price?.tiers?.[1].formattedPerUnitPrice).toBe("$0.50");
  });

  it("renders credit_limit when the server computed a credit-equivalent limit", () => {
    const row = deriveEntitlement(
      entitlement({
        priceBehavior: EntitlementPriceBehavior.CreditBurndown,
        consumptionRate: 0.07,
        creditEquivalentLimit: 700,
        creditId: "bcrd_1",
        creditName: "Credits",
      }),
      { locale: "en-US" },
    );
    expect(row.kind).toBe("credit_limit");
    expect(row.limit).toBe(700);
    expect(row.credit?.formattedConsumptionRate).toBe("0.07");
  });

  it("renders credit_rate when only a consumption rate exists", () => {
    const row = deriveEntitlement(
      entitlement({
        priceBehavior: EntitlementPriceBehavior.CreditBurndown,
        consumptionRate: 1.5,
        creditId: "bcrd_1",
        creditName: "Credits",
      }),
    );
    expect(row.kind).toBe("credit_rate");
    expect(row.credit?.consumptionRate).toBe(1.5);
  });

  it("attaches overage detail with the precomputed unit price", () => {
    const row = deriveEntitlement(
      entitlement({
        priceBehavior: EntitlementPriceBehavior.Overage,
        softLimit: 100,
        meteredMonthlyPrice: price({
          price: 0,
          period: PricePeriod.Month,
          overageUnitPriceDecimal: "25",
        }),
      }),
      { period: PricePeriod.Month, locale: "en-US" },
    );
    expect(row.kind).toBe("numeric");
    expect(row.limit).toBe(100);
    expect(row.overage?.softLimit).toBe(100);
    expect(row.overage?.formattedUnitPrice).toBe("$0.25");
  });

  it("renders numeric, unlimited, and boolean value types", () => {
    const numeric = deriveEntitlement(entitlement({ valueNumeric: 5 }), {
      locale: "en-US",
    });
    expect(numeric.kind).toBe("numeric");
    expect(numeric.formattedLimit).toBe("5");

    const unlimited = deriveEntitlement(
      entitlement({ valueType: EntitlementValueType.Unlimited }),
    );
    expect(unlimited.kind).toBe("unlimited");
    expect(unlimited.featureLabel).toBe("Seats");

    const bool = deriveEntitlement(
      entitlement({ valueType: EntitlementValueType.Boolean }),
    );
    expect(bool.kind).toBe("boolean");
    expect(bool.featureLabel).toBe("Seat");
  });

  it("resolves the singular feature name for a limit of one", () => {
    const row = deriveEntitlement(entitlement({ valueNumeric: 1 }), {
      locale: "en-US",
    });
    expect(row.featureLabel).toBe("Seat");
  });
});
