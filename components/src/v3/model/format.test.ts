import {
  featureName,
  formatConsumptionRate,
  formatCurrency,
  formatDate,
  formatPercent,
  formatShortDate,
  resolveLocale,
} from "./format";

const L = "en-US";

describe("formatCurrency", () => {
  test("divides minor units for decimal currencies", () => {
    expect(formatCurrency(1999, "usd", L)).toBe("$19.99");
    expect(formatCurrency(100000, "eur", L)).toBe("€1,000.00");
  });

  test("does not divide zero-decimal currencies", () => {
    expect(formatCurrency(1500, "jpy", L)).toBe("¥1,500");
  });

  test("keeps sub-minor-unit precision for tiny per-unit prices", () => {
    expect(formatCurrency(0.15, "usd", L)).toBe("$0.0015");
  });

  test("rounds to the currency precision when asked", () => {
    expect(
      formatCurrency(1199.4, "usd", L, { preserveSubUnitPrecision: false }),
    ).toBe("$11.99");
  });

  test("formats negatives with the locale sign", () => {
    expect(formatCurrency(-500, "usd", L)).toBe("-$5.00");
  });

  test("honours the locale", () => {
    expect(formatCurrency(123456, "eur", "de-DE").replace(/\u00a0/g, " ")).toBe(
      "1.234,56 €",
    );
  });

  test("falls back for an unknown currency code", () => {
    expect(formatCurrency(1000, "zzz", L)).toMatch(/10\.00/);
  });
});

test("formatConsumptionRate keeps ten decimal places", () => {
  expect(formatConsumptionRate(1e-10, L)).toBe("0.0000000001");
  expect(formatConsumptionRate(2, L)).toBe("2");
});

test("formatPercent", () => {
  expect(formatPercent(0.2, L)).toBe("20%");
  expect(formatPercent(0.1667, L)).toBe("17%");
});

test("dates render in long and short forms", () => {
  const date = new Date("2026-08-21T12:00:00Z");
  expect(formatDate(date, L, { timeZone: "UTC" })).toBe("August 21, 2026");
  expect(formatShortDate(date, L)).toMatch(/^8\/2[01]$/);
});

describe("featureName", () => {
  test("uses explicit forms when given", () => {
    const f = { name: "Seat", singularName: "seat", pluralName: "seats" };
    expect(featureName(f, 1)).toBe("seat");
    expect(featureName(f, 2)).toBe("seats");
    expect(featureName(f, 0)).toBe("seats");
  });

  test("pluralizes the base name otherwise", () => {
    expect(featureName({ name: "Query" }, 1)).toBe("Query");
    expect(featureName({ name: "Query" }, 3)).toBe("Queries");
  });

  test("treats empty-string names as absent", () => {
    expect(
      featureName({ name: "Seat", singularName: "", pluralName: "" }, 2),
    ).toBe("Seats");
  });
});

test("resolveLocale prefers the configured value", () => {
  expect(resolveLocale("fr-FR")).toBe("fr-FR");
  expect(resolveLocale("")).toBe(navigator.language);
});
