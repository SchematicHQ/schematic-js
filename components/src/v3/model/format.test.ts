import {
  featureName,
  formatConsumptionRate,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatShortDate,
  plural,
  resolveLocale,
  viewerLocale,
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

describe("plural", () => {
  test("picks the English form", () => {
    const forms = { one: "invoice", other: "invoices" };
    expect(plural("en-US", 1, forms)).toBe("invoice");
    expect(plural("en-US", 0, forms)).toBe("invoices");
    expect(plural("en-US", 7, forms)).toBe("invoices");
  });

  test("picks the categories a language actually uses", () => {
    // Polish: one / few / many.
    const pl = {
      one: "faktura",
      few: "faktury",
      many: "faktur",
      other: "faktury",
    };
    expect(plural("pl-PL", 1, pl)).toBe("faktura");
    expect(plural("pl-PL", 3, pl)).toBe("faktury");
    expect(plural("pl-PL", 5, pl)).toBe("faktur");
    // Japanese has only `other`, so a caller supplies only that.
    expect(plural("ja-JP", 1, { other: "請求書" })).toBe("請求書");
  });

  test("falls back to other when a category is missing", () => {
    expect(plural("en-US", 1, { other: "invoices" })).toBe("invoices");
  });
});

describe("featureName across locales", () => {
  test("inflects only where English rules apply", () => {
    const f = { name: "Seat" };
    expect(featureName(f, 2, "en-GB")).toBe("Seats");
    // No plural form configured and not English: the company's name stands.
    expect(featureName(f, 2, "de-DE")).toBe("Seat");
    expect(
      featureName({ name: "Platz", pluralName: "Plätze" }, 2, "de-DE"),
    ).toBe("Plätze");
  });

  test("takes the plural category from the locale", () => {
    const f = { name: "Seat", singularName: "seat", pluralName: "seats" };
    // French reads 0 as "one"; English reads it as plural.
    expect(featureName(f, 0, "fr-FR")).toBe("seat");
    expect(featureName(f, 0, "en-US")).toBe("seats");
  });
});

describe("an unusable locale tag", () => {
  // `en_US` — an underscore where BCP 47 wants a hyphen — is the common
  // typo, and every Intl constructor answers it with a RangeError. Thrown
  // from a derivation it takes down the host's tree instead of showing up
  // in the element's status frame.
  const BAD = "en_US";

  test("resolveLocale drops it", () => {
    expect(resolveLocale(BAD)).toBe("en-US");
  });

  test("no formatter throws on it", () => {
    expect(() => formatDate(new Date(), BAD)).not.toThrow();
    expect(() => formatShortDate(new Date(), BAD)).not.toThrow();
    expect(() => formatNumber(1234.5, BAD)).not.toThrow();
    expect(() => formatPercent(0.5, BAD)).not.toThrow();
    expect(() => formatCurrency(1000, "usd", BAD)).not.toThrow();
    // The currency fallback formats a number too, so a bad tag used to
    // throw again from inside the catch.
    expect(() => formatCurrency(1000, "not-a-currency", BAD)).not.toThrow();
    expect(() => plural(BAD, 1, { one: "a", other: "b" })).not.toThrow();
    expect(() => featureName({ name: "Seat" }, 2, BAD)).not.toThrow();
  });
});

describe("resolveLocale", () => {
  test("prefers the configured value", () => {
    expect(resolveLocale("fr-FR")).toBe("fr-FR");
  });

  test("is blind to the viewer, so a server render and its hydration agree", () => {
    expect(resolveLocale("")).toBe("en-US");
    expect(resolveLocale(undefined)).toBe("en-US");
    // The reading itself, for an effect to fold in after mount.
    expect(viewerLocale()).toBe(navigator.language);
  });
});
