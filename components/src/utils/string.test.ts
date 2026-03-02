import { describe, expect, test } from "vitest";

import {
  adjectify,
  camelToHyphen,
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
    expect(hyphenToCamel("border-top-left-radius")).toBe(
      "borderTopLeftRadius",
    );
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
    expect(camelToHyphen("borderTopLeftRadius")).toBe(
      "border-top-left-radius",
    );
  });

  test("returns string unchanged if already lowercase", () => {
    expect(camelToHyphen("color")).toBe("color");
  });

  test("returns empty string for empty input", () => {
    expect(camelToHyphen("")).toBe("");
  });
});

describe("formatNumber", () => {
  test("formats number with commas", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  test("formats small numbers without commas", () => {
    expect(formatNumber(42)).toBe("42");
  });

  test("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  test("formats negative numbers", () => {
    expect(formatNumber(-1500)).toBe("-1,500");
  });
});

describe("formatCurrency", () => {
  test("formats cents to dollar string", () => {
    expect(formatCurrency(1000)).toBe("$10.00");
    expect(formatCurrency(150)).toBe("$1.50");
    expect(formatCurrency(99)).toBe("$0.99");
  });

  test("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  test("formats negative amounts with minus sign", () => {
    expect(formatCurrency(-1000)).toBe("-$10.00");
    expect(formatCurrency(-150)).toBe("-$1.50");
  });

  test("accepts currency as string option", () => {
    expect(formatCurrency(1000, "eur")).toBe("€10.00");
    expect(formatCurrency(1000, "gbp")).toBe("£10.00");
  });

  test("accepts currency in options object", () => {
    expect(formatCurrency(1000, { currency: "eur" })).toBe("€10.00");
  });

  test("accepts testSignificantDigits as boolean option", () => {
    // When false, should not apply significant digits formatting
    const result = formatCurrency(1000, false);
    expect(result).toBe("$10.00");
  });

  test("accepts testSignificantDigits in options object", () => {
    const result = formatCurrency(1000, { testSignificantDigits: false });
    expect(result).toBe("$10.00");
  });

  test("defaults to USD when no currency specified", () => {
    expect(formatCurrency(500)).toBe("$5.00");
  });

  test("handles uppercase currency codes", () => {
    expect(formatCurrency(1000, "USD")).toBe("$10.00");
  });

  test("large amounts", () => {
    expect(formatCurrency(1000000)).toBe("$10,000.00");
  });
});

describe("formatOrdinal", () => {
  test("formats 1st", () => {
    expect(formatOrdinal(1)).toBe("1st");
  });

  test("formats 2nd", () => {
    expect(formatOrdinal(2)).toBe("2nd");
  });

  test("formats 3rd", () => {
    expect(formatOrdinal(3)).toBe("3rd");
  });

  test("formats 4th and other", () => {
    expect(formatOrdinal(4)).toBe("4th");
    expect(formatOrdinal(10)).toBe("10th");
  });

  test("formats teens correctly", () => {
    expect(formatOrdinal(11)).toBe("11th");
    expect(formatOrdinal(12)).toBe("12th");
    expect(formatOrdinal(13)).toBe("13th");
  });

  test("formats 21st, 22nd, 23rd", () => {
    expect(formatOrdinal(21)).toBe("21st");
    expect(formatOrdinal(22)).toBe("22nd");
    expect(formatOrdinal(23)).toBe("23rd");
  });
});

describe("adjectify", () => {
  test("appends 'ly' to a string", () => {
    expect(adjectify("month")).toBe("monthly");
    expect(adjectify("year")).toBe("yearly");
    expect(adjectify("week")).toBe("weekly");
  });
});
