import { describe, expect, test } from "vitest";

import {
  createSchematicI18n,
  i18n,
  schematicTranslationsIt,
  type SchematicTranslationKey,
  type Translate,
  type TranslationOptions,
} from "../localization";

import { nameInterval, normalizeInterval, shortenPeriod } from "./date";

const t: Translate = (
  key: SchematicTranslationKey,
  options: TranslationOptions = {},
) => i18n.t(key, options);

const italian = createSchematicI18n({ it: schematicTranslationsIt });
const tIt: Translate = (
  key: SchematicTranslationKey,
  options: TranslationOptions = {},
) => italian.t(key, { ...options, lng: "it" });

describe("normalizeInterval", () => {
  test("folds month×3 into a quarter and month×12 into a year", () => {
    expect(normalizeInterval("month", 3)).toEqual({
      period: "quarter",
      count: 1,
    });
    expect(normalizeInterval("month", 12)).toEqual({
      period: "year",
      count: 1,
    });
  });

  test("keeps any other count, and treats a missing count as one", () => {
    expect(normalizeInterval("month", 4)).toEqual({
      period: "month",
      count: 4,
    });
    expect(normalizeInterval("year", 2)).toEqual({ period: "year", count: 2 });
    expect(normalizeInterval("month")).toEqual({ period: "month", count: 1 });
    expect(normalizeInterval("month", null)).toEqual({
      period: "month",
      count: 1,
    });
  });
});

describe("shortenPeriod", () => {
  test("gives the bare unit for a count of one or none", () => {
    expect(shortenPeriod("month", t)).toBe("mo");
    expect(shortenPeriod("month", t, 1)).toBe("mo");
    expect(shortenPeriod("quarter", t)).toBe("qtr");
    expect(shortenPeriod("year", t)).toBe("yr");
    expect(shortenPeriod("week", t)).toBe("wk");
    expect(shortenPeriod("day", t)).toBe("day");
  });

  test("reads month×3 as a quarter and month×12 as a year", () => {
    expect(shortenPeriod("month", t, 3)).toBe("qtr");
    expect(shortenPeriod("month", t, 12)).toBe("yr");
  });

  test("leads the unit with any other count", () => {
    expect(shortenPeriod("month", t, 4)).toBe("4mo");
    expect(shortenPeriod("month", t, 6)).toBe("6mo");
    expect(shortenPeriod("year", t, 2)).toBe("2yr");
    expect(shortenPeriod("week", t, 2)).toBe("2wk");
    expect(shortenPeriod("day", t, 30)).toBe("30d");
  });

  test("gives nothing for a period it does not know", () => {
    expect(shortenPeriod("one-time", t)).toBeUndefined();
  });

  test("reads the abbreviations from the bundle", () => {
    expect(shortenPeriod("month", tIt, 12)).toBe("anno");
    expect(shortenPeriod("month", tIt, 4)).toBe("4 mesi");
  });
});

describe("nameInterval", () => {
  test("names the period for a count of one or none", () => {
    expect(nameInterval("month", t)).toBe("month");
    expect(nameInterval("month", t, 1)).toBe("month");
    expect(nameInterval("year", t)).toBe("year");
  });

  test("reads month×3 as a quarter and month×12 as a year", () => {
    expect(nameInterval("month", t, 3)).toBe("quarter");
    expect(nameInterval("month", t, 12)).toBe("year");
  });

  test("counts any other period", () => {
    expect(nameInterval("month", t, 4)).toBe("4 months");
    expect(nameInterval("year", t, 2)).toBe("2 years");
    expect(nameInterval("week", t, 2)).toBe("2 weeks");
    expect(nameInterval("day", t, 30)).toBe("30 days");
  });

  test("passes an unknown period through", () => {
    expect(nameInterval("one-time", t)).toBe("one-time");
  });

  test("reads the names from the bundle", () => {
    expect(nameInterval("month", tIt, 12)).toBe("anno");
    expect(nameInterval("month", tIt, 4)).toBe("4 mesi");
  });
});
