import type { Translate } from "@schematichq/schematic-react";

/**
 * Every string the elements render, the keys a host translates them by, and
 * the pure resolution the elements and their fallbacks share.
 *
 * The elements ship English and hold no catalogue of other languages. A host
 * translates them one of two ways, and can mix both:
 *
 *   * `strings` on the provider or on an element — a flat map of overrides,
 *     for renaming copy, or for a host with no i18n stack at all;
 *   * `translate` on the provider — the host's own `t`, which owns plurals,
 *     interpolation, and language switching.
 *
 * Formatting is not part of this: dates, numbers and currency go through
 * `Intl` for the resolved locale either way.
 */

/**
 * The language the defaults below are written in. Plural forms for a
 * fallback are selected under *these* rules, not the viewer's — English copy
 * has to inflect as English however the rest of the page is localized.
 */
export const DEFAULT_STRINGS_LOCALE = "en";

/**
 * The elements' copy, keyed.
 *
 * A type alias rather than an interface on purpose: `Partial<ElementStrings>`
 * has to satisfy the untyped `Record<string, string | undefined>` the
 * provider seam carries, and TypeScript only infers an implicit index
 * signature for aliases.
 *
 * Plural forms follow i18next's convention — a key that varies by count is
 * declared as `key_one` / `key_other` (plus `_zero`, `_two`, `_few`, `_many`
 * where a language needs them), and the elements ask for it by its bare
 * `key` with `{ count }`. One convention then resolves both the host's
 * catalogue and ours.
 */
export type ElementStrings = {
  /** Shared: the action that re-runs a failed request. */
  retry: string;

  /** Invoices: the accessible name while the history loads. */
  invoicesLoading: string;
  /** Invoices: the card heading. */
  invoicesHeader: string;
  /** Invoices: the count beside the heading, once the history is all loaded. */
  invoicesCount: string;
  /** Invoices: the count while only part of the history is loaded. */
  invoicesShowing: string;
  /** Invoices: shown in place of the table when the history is empty. */
  invoicesEmpty: string;
  /** Invoices: column headers, read by assistive technology. */
  invoicesDateColumn: string;
  invoicesAmountColumn: string;
  invoicesStatusColumn: string;
  /** Invoices: expands the collapsed list, and collapses it again. */
  invoicesSeeMore: string;
  invoicesSeeLess: string;
  /** Invoices: fetches the next page from the server. */
  invoicesLoadMore: string;
  /** Invoices: the tooltip on a credit note's amount. */
  invoicesCredit: string;
  /** Invoices: the link's text when the invoice's dates are unusable. */
  invoicesUndated: string;
  /** Invoices: the status chip, one key per `InvoiceStatus`. */
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

/** The elements' own translator: always a string, never a bare key. */
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

/** Every key, for a host wiring its catalogue up by hand. */
/** The i18next plural suffixes a key can carry. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** The key a plural variant inflects: `invoicesCount_one` → `invoicesCount`. */
function baseKey(key: string): StringKey {
  return key.replace(PLURAL_SUFFIX, "") as StringKey;
}

/**
 * The declared keys, which are the API: plural variants are spellings of one
 * of these, not keys of their own, and an element always asks by the bare
 * name with `{ count }`.
 */
export const STRING_KEYS = Object.keys(DEFAULT_STRINGS).filter(
  (key) => !PLURAL_SUFFIX.test(key),
) as StringKey[];

/**
 * What each string is for, in a translator's terms: where it appears and
 * what constrains it. Shipped beside the copy in `locales/en.json`, because
 * "Open" and "Draft" are unguessable on their own.
 */
export const STRING_DESCRIPTIONS: Record<StringKey, string> = {
  retry: "Button. Runs a failed request again. Appears in every element.",

  invoicesLoading:
    "Accessible name for the invoice card while its history loads. Read aloud, never seen.",
  invoicesHeader: "Heading of the invoice history card.",
  invoicesCount:
    "Count beside the heading when every invoice is on screen. Takes {{count}}.",
  invoicesShowing:
    "Count beside the heading while more history is loadable. Takes {{shown}} and {{count}}.",
  invoicesEmpty: "Replaces the table when the company has no invoices.",
  invoicesDateColumn:
    "Column header over each invoice's due date. Also read by assistive technology.",
  invoicesAmountColumn:
    "Column header over each invoice's amount. Also read by assistive technology.",
  invoicesStatusColumn:
    "Column header over each invoice's status. Also read by assistive technology.",
  invoicesSeeMore:
    "Button. Expands the list from its first few rows to everything loaded.",
  invoicesSeeLess:
    "Button. Collapses the expanded list back to its first few rows.",
  invoicesLoadMore:
    "Button. Fetches the next page of older invoices from the server.",
  invoicesCredit:
    "Tooltip on a negative amount, which is a credit note rather than a charge.",
  invoicesUndated:
    "Text of the link to a hosted invoice, used in place of a date the API sent unusable.",
  invoiceStatusDraft: "Invoice status: not finalized, and not yet owed.",
  invoiceStatusOpen: "Invoice status: finalized and awaiting payment.",
  invoiceStatusPaid: "Invoice status: settled in full.",
  invoiceStatusUncollectible:
    "Invoice status: written off after payment failed.",
  invoiceStatusVoid: "Invoice status: cancelled, and never owed.",
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

/**
 * The copy and its translator notes as an ARB bundle — the message format
 * translation tools read. Written to `locales/en.json`, which the build
 * ships and `strings.test.ts` keeps in step with this file.
 */
export function arbBundle(): Record<string, unknown> {
  const bundle: Record<string, unknown> = {
    "@@locale": DEFAULT_STRINGS_LOCALE,
  };
  // Every entry, plural variants included: a translator needs the forms to
  // translate, and each carries the description of the key it inflects.
  for (const key of Object.keys(DEFAULT_STRINGS)) {
    bundle[key] = DEFAULT_STRINGS[key];
    bundle[`@${key}`] = { description: STRING_DESCRIPTIONS[baseKey(key)] };
  }
  return bundle;
}

export type { Translate };
