import type { Translate } from "@schematichq/schematic-react";

/**
 * The elements ship English and hold no catalogue of other languages: a host
 * either overrides copy through `strings`, or routes it through `translate`,
 * its own `t`, which then owns plurals and interpolation.
 */

/** Fallback plurals resolve under *these* rules, not the viewer's. */
export const DEFAULT_STRINGS_LOCALE = "en";

/**
 * A type alias, not an interface: `Partial<ElementStrings>` has to satisfy
 * the untyped `Record<string, string | undefined>` the provider seam
 * carries, and TypeScript infers an implicit index signature only for
 * aliases.
 *
 * Plural forms follow i18next's `key_one` / `key_other` convention, asked
 * for by the bare `key` with `{ count }`, so one convention resolves both
 * the host's catalogue and ours.
 */
export type ElementStrings = {
  retry: string;

  invoicesLoading: string;
  invoicesHeader: string;
  invoicesCount: string;
  invoicesShowing: string;
  invoicesEmpty: string;
  invoicesDateColumn: string;
  invoicesAmountColumn: string;
  invoicesStatusColumn: string;
  invoicesSeeMore: string;
  invoicesSeeLess: string;
  invoicesLoadMore: string;
  invoicesCredit: string;
  invoicesUndated: string;
  invoiceStatusDraft: string;
  invoiceStatusOpen: string;
  invoiceStatusPaid: string;
  invoiceStatusUncollectible: string;
  invoiceStatusVoid: string;
};

export type StringKey = keyof ElementStrings;

/** A flat catalogue: what a host's `strings` and our defaults both are. */
export type StringCatalog = Record<string, string | undefined>;

/** The i18next plural suffixes a key can carry. */
type PluralSuffix = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * Copy overrides a host supplies, on the provider or on an element. Plural
 * spellings of a declared key count: a key that varies by count is what
 * `key_one`/`key_other` are for, and an override that could only give the
 * bare form would answer `1` and `14` with the same words.
 */
export type StringOverrides = Partial<ElementStrings> &
  Partial<Record<`${StringKey}_${PluralSuffix}`, string>>;

/** Interpolation values, and `count` for the plural form. */
export type StringVars = Record<string, unknown>;

export type Translator = (key: StringKey, vars?: StringVars) => string;

/**
 * The English copy, and the fallback for anything a host does not answer.
 * It is a plain resource bundle, so it registers as one:
 *
 * ```ts
 * i18n.addResourceBundle("en", "schematic", DEFAULT_STRINGS);
 * ```
 *
 * Registering it is optional. The elements hand their English to `translate`
 * as the request's `defaultValue`, and render it themselves on a miss.
 */
// The plural variants sit beside the bare keys they inflect, so the type is
// the catalogue's shape rather than only its declared keys — `lookup` reads
// `key_one`/`key_other` and falls back to the bare one.
export const DEFAULT_STRINGS: ElementStrings & StringCatalog = {
  retry: "Retry",

  invoicesLoading: "Loading invoices",
  invoicesHeader: "Invoices",
  invoicesCount: "{{count}} invoices",
  invoicesCount_one: "{{count}} invoice",
  invoicesCount_other: "{{count}} invoices",
  invoicesShowing: "{{shown}} of {{count}} invoices",
  invoicesShowing_one: "{{shown}} of {{count}} invoice",
  invoicesShowing_other: "{{shown}} of {{count}} invoices",
  invoicesEmpty: "No invoices yet",
  invoicesDateColumn: "Date",
  invoicesAmountColumn: "Amount",
  invoicesStatusColumn: "Status",
  invoicesSeeMore: "See more",
  invoicesSeeLess: "See less",
  invoicesLoadMore: "Load more",
  invoicesCredit: "Credit applied to your account",
  invoicesUndated: "View invoice",
  invoiceStatusDraft: "Draft",
  invoiceStatusOpen: "Open",
  invoiceStatusPaid: "Paid",
  invoiceStatusUncollectible: "Uncollectible",
  invoiceStatusVoid: "Void",
};

/**
 * Handed to a host's `translate` as `defaultValue`, and read back to tell a
 * real translation from a stack that answers every key with something. A
 * leading NUL keeps any catalogue from returning it by accident.
 */
export const MISSING_STRING = "\u0000schematic:missing";

/**
 * Fills `{{name}}` placeholders from `vars`, i18next's syntax. A placeholder
 * with no value is left as written rather than blanked, so a missing one
 * shows up instead of silently disappearing.
 */
export function interpolate(template: string, vars?: StringVars): string {
  if (vars === undefined || !template.includes("{{")) {
    return template;
  }
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? whole : String(value);
  });
}

/** The CLDR plural category for `count` in `locale`; `other` if unknown. */
function pluralCategory(count: number, locale: string): Intl.LDMLPluralRule {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return "other";
  }
}

/**
 * Resolves one key against one catalogue: picks the plural form when `vars`
 * carries a `count`, then interpolates. `locale` is the language the
 * catalogue is written in, which is what decides its plural forms — English
 * for our defaults, the resolved locale for a host's own overrides.
 *
 * Returns `undefined` when the catalogue has no entry, so a caller can fall
 * through to the next source.
 */
export function lookup(
  catalog: StringCatalog | undefined,
  key: string,
  vars?: StringVars,
  locale: string = DEFAULT_STRINGS_LOCALE,
): string | undefined {
  if (catalog === undefined) {
    return undefined;
  }
  const count = vars?.count;
  const template =
    typeof count === "number"
      ? (catalog[`${key}_${pluralCategory(count, locale)}`] ??
        catalog[`${key}_other`] ??
        catalog[key])
      : catalog[key];
  return template === undefined ? undefined : interpolate(template, vars);
}

/**
 * The English an element renders when nothing else answers the key. Bottoms
 * out at the key itself, so `Translator`'s `string` holds even for a key the
 * catalogue has never heard of.
 */
export function defaultString(key: StringKey, vars?: StringVars): string {
  return lookup(DEFAULT_STRINGS, key, vars) ?? DEFAULT_STRINGS[key] ?? key;
}

export type { Translate };
