import { describe, expect, test } from "vitest";

import { createSchematicI18n, i18n, type Translate } from "../localization";

import {
  adjectify,
  camelToHyphen,
  formatConsumptionRate,
  formatCurrency,
  formatNumber,
  formatOrdinal,
  hyphenToCamel,
} from "./string";

describe("hyphenToCamel", () => {
  test("converts hyphenated string to camelCase", () => {
    expect(hyphenToCamel("font-size")).toBe("fontSize");
  });

  test("converts multiple hyphens", () => {
    expect(hyphenToCamel("border-top-left-radius")).toBe("borderTopLeftRadius");
  });

  test("returns string unchanged if no hyphens", () => {
    expect(hyphenToCamel("color")).toBe("color");
  });

  test("returns empty string for empty input", () => {
    expect(hyphenToCamel("")).toBe("");
  });
});

describe("camelToHyphen", () => {
  test("converts camelCase to hyphenated", () => {
    expect(camelToHyphen("fontSize")).toBe("font-size");
  });

  test("converts multiple uppercase letters", () => {
    expect(camelToHyphen("borderTopLeftRadius")).toBe("border-top-left-radius");
  });

  test("returns string unchanged if already lowercase", () => {
    expect(camelToHyphen("color")).toBe("color");
  });

  test("returns empty string for empty input", () => {
    expect(camelToHyphen("")).toBe("");
  });
});

const locale = "en-US";
const t: Translate = (key, options) => i18n.t(key, options);

describe("formatNumber", () => {
  test("formats number with commas", () => {
    expect(formatNumber(1000, { locale })).toBe("1,000");
    expect(formatNumber(1000000, { locale })).toBe("1,000,000");
  });

  test("formats small numbers without commas", () => {
    expect(formatNumber(42, { locale })).toBe("42");
  });

  test("formats zero", () => {
    expect(formatNumber(0, { locale })).toBe("0");
  });

  test("formats negative numbers", () => {
    expect(formatNumber(-1500, { locale })).toBe("-1,500");
  });

  test("passes through Intl options", () => {
    expect(
      formatNumber(0.0000000001, { locale, maximumFractionDigits: 10 }),
    ).toBe("0.0000000001");
  });
});

describe("formatConsumptionRate", () => {
  test("renders whole-number rates without decimals", () => {
    expect(formatConsumptionRate(1, locale)).toBe("1");
    expect(formatConsumptionRate(5, locale)).toBe("5");
  });

  test("renders very small rates in full instead of scientific notation", () => {
    expect(formatConsumptionRate(1e-10, locale)).toBe("0.0000000001");
    expect(formatConsumptionRate(0.0000000523, locale)).toBe("0.0000000523");
  });

  test("does not round tiny rates down to zero", () => {
    expect(formatConsumptionRate(0.0001, locale)).toBe("0.0001");
    expect(formatConsumptionRate(1e-10, locale)).not.toBe("0");
  });

  test("keeps grouping for larger rates", () => {
    expect(formatConsumptionRate(1000, locale)).toBe("1,000");
    expect(formatConsumptionRate(1500.5, locale)).toBe("1,500.5");
  });

  test("formats zero", () => {
    expect(formatConsumptionRate(0, locale)).toBe("0");
  });
});

describe("formatCurrency", () => {
  test("formats cents to dollar string", () => {
    expect(formatCurrency(1000, { locale })).toBe("$10.00");
    expect(formatCurrency(150, { locale })).toBe("$1.50");
    expect(formatCurrency(99, { locale })).toBe("$0.99");
  });

  test("formats zero", () => {
    expect(formatCurrency(0, { locale })).toBe("$0.00");
  });

  test("formats negative amounts with minus sign", () => {
    expect(formatCurrency(-1000, { locale })).toBe("-$10.00");
    expect(formatCurrency(-150, { locale })).toBe("-$1.50");
  });

  test("accepts a currency", () => {
    expect(formatCurrency(1000, { locale, currency: "eur" })).toBe("€10.00");
    expect(formatCurrency(1000, { locale, currency: "gbp" })).toBe("£10.00");
  });

  test("accepts a lowercase currency", () => {
    expect(formatCurrency(1000, { locale, currency: "eur" })).toBe("€10.00");
  });

  test("accepts testSignificantDigits", () => {
    const result = formatCurrency(1000, {
      locale,
      testSignificantDigits: false,
    });
    expect(result).toBe("$10.00");
  });

  test("accepts testSignificantDigits in options object", () => {
    const result = formatCurrency(1000, {
      locale,
      testSignificantDigits: false,
    });
    expect(result).toBe("$10.00");
  });

  test("rounds fractional minor units when testSignificantDigits is false", () => {
    // 40% of $19.99 is 799.6 cents; standard currency precision shows $8.00,
    // not $7.996.
    expect(
      formatCurrency(799.6, {
        locale,
        currency: "usd",
        testSignificantDigits: false,
      }),
    ).toBe("$8.00");
    expect(
      formatCurrency(799.6, {
        locale,
        currency: "jpy",
        testSignificantDigits: false,
      }),
    ).toBe("¥800");
  });

  test("defaults to USD when no currency specified", () => {
    expect(formatCurrency(500, { locale })).toBe("$5.00");
  });

  test("handles uppercase currency codes", () => {
    expect(formatCurrency(1000, { locale, currency: "USD" })).toBe("$10.00");
  });

  test("large amounts", () => {
    expect(formatCurrency(1000000, { locale })).toBe("$10,000.00");
  });

  test("formats for the given locale", () => {
    expect(formatCurrency(123456, { locale: "it-IT", currency: "eur" })).toBe(
      "1234,56\u00a0€",
    );
  });
});

describe("formatOrdinal", () => {
  test("formats 1st", () => {
    expect(formatOrdinal(1, t)).toBe("1st");
  });

  test("formats 2nd", () => {
    expect(formatOrdinal(2, t)).toBe("2nd");
  });

  test("formats 3rd", () => {
    expect(formatOrdinal(3, t)).toBe("3rd");
  });

  test("formats 4th and other", () => {
    expect(formatOrdinal(4, t)).toBe("4th");
    expect(formatOrdinal(10, t)).toBe("10th");
  });

  test("formats teens correctly", () => {
    expect(formatOrdinal(11, t)).toBe("11th");
    expect(formatOrdinal(12, t)).toBe("12th");
    expect(formatOrdinal(13, t)).toBe("13th");
  });

  test("formats 21st, 22nd, 23rd", () => {
    expect(formatOrdinal(21, t)).toBe("21st");
    expect(formatOrdinal(22, t)).toBe("22nd");
    expect(formatOrdinal(23, t)).toBe("23rd");
  });
});

describe("formatOrdinal with a translation", () => {
  test("uses the bundle's ordinal suffixes", () => {
    const it = createSchematicI18n({
      it: { Ordinal_ordinal_other: "{{count}}º" },
    });
    const translate: Translate = (key, options) =>
      it.t(key, { ...options, lng: "it" });

    expect(formatOrdinal(1, translate)).toBe("1º");
    expect(formatOrdinal(22, translate)).toBe("22º");
  });
});

describe("adjectify", () => {
  test("appends 'ly' to a string", () => {
    expect(adjectify("month")).toBe("monthly");
    expect(adjectify("year")).toBe("yearly");
    expect(adjectify("week")).toBe("weekly");
  });
});
