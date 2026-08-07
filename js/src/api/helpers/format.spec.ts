import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatDate,
  formatNumber,
  getDisplayPrice,
  periodSuffix,
} from "./format";
import { pluralize } from "./pluralize";
import { calculateTieredCost, derivePeriod, getPriceValue } from "./pricing";

describe("formatCurrency", () => {
  it("formats cents as dollars", () => {
    expect(formatCurrency(1000)).toBe("$10.00");
    expect(formatCurrency(1999, "usd")).toBe("$19.99");
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("renders negative amounts accounting-style", () => {
    expect(formatCurrency(-1050)).toBe("($10.50)");
  });

  it("respects other currencies", () => {
    expect(formatCurrency(1000, "eur")).toBe("€10.00");
  });

  it("does not divide zero-decimal currencies by 100", () => {
    // JPY amounts arrive already in the smallest unit.
    expect(formatCurrency(5000, "jpy")).toBe("¥5,000");
    expect(formatCurrency(5000, "JPY")).toBe("¥5,000");
    expect(formatCurrency(1500, "krw")).toBe("₩1,500");
    // ...while decimal currencies still do.
    expect(formatCurrency(5000, "usd")).toBe("$50.00");
  });

  it("preserves sub-cent amounts instead of rounding to zero", () => {
    // A 0.4-cent-per-unit overage price must not render as "$0.00".
    expect(formatCurrency(0.4)).toBe("$0.004");
    expect(formatCurrency(0.5, "usd")).toBe("$0.005");
    expect(formatCurrency(2.5)).toBe("$0.025");
    // Whole-cent amounts keep conventional two-decimal formatting.
    expect(formatCurrency(1999)).toBe("$19.99");
  });

  it("falls back rather than throwing on an invalid currency code", () => {
    expect(formatCurrency(1000, "not-a-currency")).toBe("$10.00");
  });
});

describe("formatDate", () => {
  it("formats dates and tolerates junk", () => {
    expect(formatDate(new Date("2026-01-15T00:00:00Z"))).toMatch(
      /Jan 1[45], 2026/,
    );
    expect(formatDate("2026-01-15T12:00:00Z")).toMatch(/Jan 15, 2026/);
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("not a date")).toBe("");
  });
});

describe("periodSuffix", () => {
  it("maps periods to suffixes", () => {
    expect(periodSuffix("month")).toBe("/mo");
    expect(periodSuffix("quarter")).toBe("/qtr");
    expect(periodSuffix("year")).toBe("/yr");
    expect(periodSuffix("one-time")).toBe("");
    expect(periodSuffix(undefined)).toBe("");
  });
});

describe("pluralize / formatNumber", () => {
  it("pluralizes and formats", () => {
    expect(pluralize("seat", 1)).toBe("seat");
    expect(pluralize("seat", 2)).toBe("seats");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("handles words a naive trailing-s rule gets wrong", () => {
    expect(pluralize("entry", 3)).toBe("entries");
    expect(pluralize("policy", 2)).toBe("policies");
    expect(pluralize("person", 5)).toBe("people");
    expect(pluralize("analysis", 2)).toBe("analyses");
    expect(pluralize("credits", 1)).toBe("credit");
  });
});

describe("getDisplayPrice", () => {
  it("shows the full billed price when showAsMonthlyPrices is off", () => {
    expect(getDisplayPrice(58800, "year", false)).toEqual({
      amount: 58800,
      suffix: "/yr",
      isMonthlyEquivalent: false,
    });
  });

  it("divides yearly and quarterly prices down when the setting is on", () => {
    expect(getDisplayPrice(58800, "year", true)).toEqual({
      amount: 4900,
      suffix: "/month, billed yearly",
      isMonthlyEquivalent: true,
    });
    expect(getDisplayPrice(15000, "quarter", true)).toEqual({
      amount: 5000,
      suffix: "/month, billed quarterly",
      isMonthlyEquivalent: true,
    });
  });

  it("leaves monthly prices alone even when the setting is on", () => {
    expect(getDisplayPrice(4900, "month", true)).toEqual({
      amount: 4900,
      suffix: "/mo",
      isMonthlyEquivalent: false,
    });
  });

  it("renders a repeating monthly equivalent as money, not a sub-cent rate", () => {
    const display = getDisplayPrice(58900, "year", true);
    expect(
      formatCurrency(display.amount, "usd", { significantDigits: false }),
    ).toBe("$49.08");
  });
});

describe("derivePeriod", () => {
  it("detects quarterly stored as month x3", () => {
    expect(derivePeriod("month", 3)).toBe("quarter");
    expect(derivePeriod("month", 1)).toBe("month");
    expect(derivePeriod("year")).toBe("year");
    expect(derivePeriod(undefined)).toBeUndefined();
  });
});

describe("getPriceValue", () => {
  it("prefers the decimal representation", () => {
    expect(
      getPriceValue({ price: 1000, priceDecimal: "1000.5", currency: "usd" }),
    ).toBe(1000.5);
    expect(
      getPriceValue({ price: 1000, priceDecimal: null, currency: "usd" }),
    ).toBe(1000);
  });
});

describe("calculateTieredCost", () => {
  const tiers = [
    {
      upTo: 10,
      perUnitPrice: 100,
      perUnitPriceDecimal: null,
      flatAmount: null,
    },
    {
      upTo: null,
      perUnitPrice: 50,
      perUnitPriceDecimal: null,
      flatAmount: null,
    },
  ];

  it("graduated mode charges each tier for its span", () => {
    expect(calculateTieredCost(5, tiers)).toBe(500);
    expect(calculateTieredCost(15, tiers)).toBe(10 * 100 + 5 * 50);
  });

  it("volume mode charges the whole quantity at the landing tier", () => {
    expect(calculateTieredCost(5, tiers, "volume")).toBe(500);
    expect(calculateTieredCost(15, tiers, "volume")).toBe(15 * 50);
  });
});
