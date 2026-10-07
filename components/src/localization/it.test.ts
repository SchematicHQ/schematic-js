import { describe, expect, test } from "vitest";

import en from "./en";
import it from "./it";

const PLURAL_SUFFIX = /_(ordinal_)?(zero|one|two|few|many|other)$/;

const base = (key: string) => key.replace(PLURAL_SUFFIX, "");

/**
 * The `{{name}}` placeholders in a string, ignoring any format. `count` is left
 * out, since it picks the plural form and a singular may not print it.
 */
const placeholders = (value: string) =>
  [...value.matchAll(/{{\s*(\w+)[^}]*}}/g)]
    .map((match) => match[1])
    .filter((name) => name !== "count")
    .sort();

const enKeys = Object.keys(en);
const itKeys = Object.keys(it);

/** English plural keys by base key, and whether each is ordinal. */
const enPlurals = new Map(
  enKeys
    .filter((key) => PLURAL_SUFFIX.test(key))
    .map((key) => [base(key), key.includes("_ordinal_")]),
);

/**
 * The English text a key translates: the key itself, or for a plural form
 * Italian has and English lacks (`_many`), English's `_other`.
 */
const englishFor = (key: string) =>
  en[key as keyof typeof en] ??
  en[key.replace(PLURAL_SUFFIX, "_$1other") as keyof typeof en];

describe("the Italian bundle", () => {
  test("has only keys the English bundle has", () => {
    const unknown = itKeys.filter((key) =>
      PLURAL_SUFFIX.test(key) ? !enPlurals.has(base(key)) : !(key in en),
    );

    expect(unknown).toEqual([]);
  });

  // Italian falls back to English for a missing key, so nothing else catches a
  // new English string that never got an Italian one.
  test("translates every English key", () => {
    const itBases = new Set(itKeys.map(base));
    const missing = [...new Set(enKeys.map(base))].filter(
      (key) => !itBases.has(key),
    );

    expect(missing).toEqual([]);
  });

  test("keeps every placeholder", () => {
    const mismatched = itKeys.filter(
      (key) =>
        placeholders(it[key as keyof typeof it] ?? "").join() !==
        placeholders(englishFor(key) ?? "").join(),
    );

    expect(mismatched).toEqual([]);
  });

  test("has every Italian plural form of a plural it translates", () => {
    const cardinal = new Intl.PluralRules("it").resolvedOptions()
      .pluralCategories;
    const ordinal = new Intl.PluralRules("it", {
      type: "ordinal",
    }).resolvedOptions().pluralCategories;

    const missing = [...enPlurals]
      .filter(([key]) => itKeys.some((itKey) => base(itKey) === key))
      .flatMap(([key, isOrdinal]) =>
        (isOrdinal ? ordinal : cardinal)
          .map((category) => `${key}_${isOrdinal ? "ordinal_" : ""}${category}`)
          .filter((form) => !(form in it)),
      );

    expect(missing).toEqual([]);
  });
});
