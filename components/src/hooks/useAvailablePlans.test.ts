import { describe, expect, test } from "vitest";

import { type CompanyPlanDetailResponseData } from "../api/checkoutexternal";

import { planSupportsCurrency } from "./useAvailablePlans";

const plan = (
  overrides: Partial<CompanyPlanDetailResponseData>,
): CompanyPlanDetailResponseData =>
  ({
    currencyPrices: [],
    ...overrides,
  }) as CompanyPlanDetailResponseData;

describe("planSupportsCurrency", () => {
  test("returns true when a currency_prices row matches (case-insensitive)", () => {
    const p = plan({
      currencyPrices: [
        { currency: "USD" },
        { currency: "eur" },
      ] as CompanyPlanDetailResponseData["currencyPrices"],
    });

    expect(planSupportsCurrency(p, "USD")).toBe(true);
    expect(planSupportsCurrency(p, "usd")).toBe(true);
    expect(planSupportsCurrency(p, "EUR")).toBe(true);
    expect(planSupportsCurrency(p, "eur")).toBe(true);
  });

  test("returns false when no currency_prices row matches", () => {
    const p = plan({
      currencyPrices: [
        { currency: "USD" },
      ] as CompanyPlanDetailResponseData["currencyPrices"],
    });

    expect(planSupportsCurrency(p, "EUR")).toBe(false);
    expect(planSupportsCurrency(p, "GBP")).toBe(false);
  });

  test("falls back to legacy price currency when currency_prices is empty", () => {
    const p = plan({
      currencyPrices: [],
      monthlyPrice: {
        currency: "EUR",
      } as CompanyPlanDetailResponseData["monthlyPrice"],
    });

    expect(planSupportsCurrency(p, "EUR")).toBe(true);
    expect(planSupportsCurrency(p, "USD")).toBe(false);
  });

  test("legacy fallback prefers monthly, then yearly, then one-time", () => {
    const yearlyOnly = plan({
      currencyPrices: [],
      yearlyPrice: {
        currency: "GBP",
      } as CompanyPlanDetailResponseData["yearlyPrice"],
    });
    expect(planSupportsCurrency(yearlyOnly, "GBP")).toBe(true);

    const oneTimeOnly = plan({
      currencyPrices: [],
      oneTimePrice: {
        currency: "JPY",
      } as CompanyPlanDetailResponseData["oneTimePrice"],
    });
    expect(planSupportsCurrency(oneTimeOnly, "JPY")).toBe(true);
  });

  test("returns false when the plan has no prices at all", () => {
    expect(planSupportsCurrency(plan({}), "USD")).toBe(false);
  });
});
