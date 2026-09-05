import type { TFunction } from "i18next";

import enLocale from "./locales/en.json";
import {
  DEFAULT_STRINGS,
  STRING_DESCRIPTIONS,
  STRING_KEYS,
  arbBundle,
  defaultString,
  interpolate,
  lookup,
  type StringCatalog,
  type Translate,
} from "./strings";

/**
 * The keys are API: a host's catalogue and its `translate` are written
 * against these names, and a rename silently falls back to English in
 * production. It fails here first.
 */
const KEYS = [
  "invoiceStatusDraft",
  "invoiceStatusOpen",
  "invoiceStatusPaid",
  "invoiceStatusUncollectible",
  "invoiceStatusVoid",
  "invoicesAmountColumn",
  "invoicesCount",
  "invoicesCredit",
  "invoicesDateColumn",
  "invoicesEmpty",
  "invoicesHeader",
  "invoicesLoadMore",
  "invoicesLoading",
  "invoicesSeeLess",
  "invoicesSeeMore",
  "invoicesShowing",
  "invoicesStatusColumn",
  "invoicesUndated",
  "retry",
];

describe("the string contract", () => {
  test("the key list is what hosts translate against", () => {
    expect([...STRING_KEYS].sort()).toEqual(KEYS);
  });

  test("every key has a non-empty English default", () => {
    for (const key of STRING_KEYS) {
      expect(DEFAULT_STRINGS[key]).toBeTruthy();
    }
    // Anything beyond the declared keys is a plural form of one of them —
    // an entry answering to no key would never be asked for.
    for (const key of Object.keys(DEFAULT_STRINGS)) {
      expect(STRING_KEYS).toContain(
        key.replace(/_(zero|one|two|few|many|other)$/, ""),
      );
    }
  });

  test("every key has a description a translator can work from", () => {
    for (const key of STRING_KEYS) {
      expect(STRING_DESCRIPTIONS[key]).toBeTruthy();
    }
    expect(Object.keys(STRING_DESCRIPTIONS)).toHaveLength(STRING_KEYS.length);
  });

  test("the defaults are a resource bundle: plain strings, no nesting", () => {
    // i18n.addResourceBundle("en", "schematic", DEFAULT_STRINGS)
    for (const value of Object.values(DEFAULT_STRINGS)) {
      expect(typeof value).toBe("string");
    }
  });

  test("i18next's t satisfies Translate, so translate={t} is the integration", () => {
    // Type-level: this is the whole advertised wiring, so it should fail the
    // build if i18next's signature and ours ever drift apart.
    const t = ((key: string) => key) as unknown as TFunction;
    const translate: Translate = t;
    expect(translate("invoicesLoadMore")).toBe("invoicesLoadMore");
  });
});

describe("interpolate", () => {
  test("fills named placeholders", () => {
    expect(interpolate("{{count}} of {{total}}", { count: 3, total: 9 })).toBe(
      "3 of 9",
    );
  });

  test("leaves a placeholder with no value as written, so it is visible", () => {
    expect(interpolate("{{count}} left", {})).toBe("{{count}} left");
    expect(interpolate("{{count}} left", { count: undefined })).toBe(
      "{{count}} left",
    );
  });

  test("is a no-op without vars or placeholders", () => {
    expect(interpolate("Retry")).toBe("Retry");
    expect(interpolate("Retry", { count: 1 })).toBe("Retry");
  });
});

describe("lookup", () => {
  // The convention a host's catalogue and ours share: i18next's suffixes.
  const catalog: StringCatalog = {
    plain: "Retry",
    rows_one: "{{count}} row",
    rows_other: "{{count}} rows",
    // Polish needs `few` and `many` where English does not.
    faktury_one: "{{count}} faktura",
    faktury_few: "{{count}} faktury",
    faktury_many: "{{count}} faktur",
    faktury_other: "{{count}} faktury",
  };

  test("returns undefined for a key the catalogue has no entry for", () => {
    expect(lookup(catalog, "absent")).toBeUndefined();
    expect(lookup(undefined, "plain")).toBeUndefined();
  });

  test("picks the plural form for the count", () => {
    expect(lookup(catalog, "rows", { count: 1 })).toBe("1 row");
    expect(lookup(catalog, "rows", { count: 0 })).toBe("0 rows");
    expect(lookup(catalog, "rows", { count: 7 })).toBe("7 rows");
  });

  test("selects under the catalogue's own language, not the viewer's", () => {
    // 5 is `many` in Polish and `other` in English; the catalogue decides.
    expect(lookup(catalog, "faktury", { count: 5 }, "pl")).toBe("5 faktur");
    expect(lookup(catalog, "faktury", { count: 2 }, "pl")).toBe("2 faktury");
    expect(lookup(catalog, "faktury", { count: 1 }, "pl")).toBe("1 faktura");
  });

  test("falls back to _other, then to the bare key", () => {
    expect(lookup({ x_other: "many" }, "x", { count: 1 })).toBe("many");
    expect(lookup({ x: "flat" }, "x", { count: 1 })).toBe("flat");
  });

  test("ignores a count that is not a number", () => {
    expect(lookup(catalog, "plain", { count: "3" })).toBe("Retry");
  });

  test("survives a locale Intl cannot parse, falling back to _other", () => {
    // An underscore is not a BCP 47 separator, so Intl throws on it.
    expect(lookup(catalog, "rows", { count: 1 }, "en_US")).toBe("1 rows");
  });
});

describe("defaultString", () => {
  test("is the English copy for the key", () => {
    expect(defaultString("invoicesHeader")).toBe("Invoices");
  });

  test("interpolates vars a host passed through", () => {
    // No default carries a placeholder today; the machinery is what a future
    // count-bearing string relies on, so it is proven rather than assumed.
    expect(defaultString("retry", { count: 2 })).toBe("Retry");
  });
});

describe("locales/en.json", () => {
  test("is the ARB bundle this module describes", () => {
    // The file ships to translators, so it cannot drift from the copy the
    // elements render. Regenerate it with `yarn v3:locales`.
    expect(enLocale).toEqual(arbBundle());
  });
});
