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
  /** Invoices: the status chip, one key per `InvoiceStatus`. */
  invoiceStatusDraft: string;
  invoiceStatusOpen: string;
  invoiceStatusPaid: string;
  invoiceStatusUncollectible: string;
  invoiceStatusVoid: string;

  /** UpcomingBill: the accessible name while the next bill loads. */
  upcomingBillLoading: string;
  /** UpcomingBill: the card heading, with the date the bill is due. */
  upcomingBillHeader: string;
  /** UpcomingBill: the heading when the provider names no due date. */
  upcomingBillHeaderUndated: string;
  /** UpcomingBill: beside the amount, which is an estimate until it is charged. */
  upcomingBillEstimate: string;
  /** UpcomingBill: shown when the company has no next bill. */
  upcomingBillEmpty: string;
  /** UpcomingBill: the row for balance this invoice consumes. */
  upcomingBillBalanceApplied: string;
  /** UpcomingBill: the row for balance surviving this invoice. */
  upcomingBillBalanceRemaining: string;
  /** UpcomingBill: the label on a discount row. */
  upcomingBillDiscount: string;
  /** UpcomingBill: what a discount takes off, e.g. "20% off". */
  upcomingBillDiscountValue: string;
  /** UpcomingBill: a repeating discount, e.g. "20% off for 3 months". */
  upcomingBillDiscountRepeating_one: string;
  upcomingBillDiscountRepeating_other: string;
};

/**
 * Keys whose copy varies by count. The catalogue declares them with
 * i18next's `_one` / `_other` suffixes; an element asks for the bare name
 * and passes `{ count }`, and `lookup` picks the form — the same call a
 * host's own catalogue answers.
 */
export type PluralStringKey = "upcomingBillDiscountRepeating";

export type StringKey = keyof ElementStrings | PluralStringKey;

/** A flat catalogue: what a host's `strings` and our defaults both are. */
export type StringCatalog = Record<string, string | undefined>;

/** Copy overrides a host supplies, on the provider or on an element. */
export type StringOverrides = Partial<ElementStrings>;

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
export const DEFAULT_STRINGS: ElementStrings = {
  retry: "Retry",

  invoicesLoading: "Loading invoices",
  invoicesHeader: "Invoices",
  invoicesEmpty: "No invoices yet",
  invoicesDateColumn: "Date",
  invoicesAmountColumn: "Amount",
  invoicesStatusColumn: "Status",
  invoicesSeeMore: "See more",
  invoicesSeeLess: "See less",
  invoicesLoadMore: "Load more",
  invoicesCredit: "Credit applied to your account",
  invoiceStatusDraft: "Draft",
  invoiceStatusOpen: "Open",
  invoiceStatusPaid: "Paid",
  invoiceStatusUncollectible: "Uncollectible",
  invoiceStatusVoid: "Void",

  upcomingBillLoading: "Loading your next bill",
  upcomingBillHeader: "Next bill due {{date}}",
  upcomingBillHeaderUndated: "Next bill",
  upcomingBillEstimate: "Estimated bill",
  upcomingBillEmpty: "No upcoming invoice",
  upcomingBillBalanceApplied: "Applied balance towards next invoice",
  upcomingBillBalanceRemaining: "Remaining balance after next invoice",
  upcomingBillDiscount: "Discount",
  upcomingBillDiscountValue: "{{value}} off",
  upcomingBillDiscountRepeating_one: "{{value}} off for {{count}} month",
  upcomingBillDiscountRepeating_other: "{{value}} off for {{count}} months",
};

/**
 * Every catalogue entry, for a host wiring one up by hand. Plural keys
 * appear in their suffixed forms — those are the entries a catalogue holds.
 */
export const STRING_KEYS = Object.keys(
  DEFAULT_STRINGS,
) as (keyof ElementStrings)[];

/**
 * What each string is for, in a translator's terms: where it appears and
 * what constrains it. Shipped beside the copy in `locales/en.json`, because
 * "Open" and "Draft" are unguessable on their own.
 */
export const STRING_DESCRIPTIONS: Record<keyof ElementStrings, string> = {
  retry: "Button. Runs a failed request again. Appears in every element.",

  invoicesLoading:
    "Accessible name for the invoice card while its history loads. Read aloud, never seen.",
  invoicesHeader: "Heading of the invoice history card.",
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
  invoiceStatusDraft: "Invoice status: not finalized, and not yet owed.",
  invoiceStatusOpen: "Invoice status: finalized and awaiting payment.",
  invoiceStatusPaid: "Invoice status: settled in full.",
  invoiceStatusUncollectible:
    "Invoice status: written off after payment failed.",
  invoiceStatusVoid: "Invoice status: cancelled, and never owed.",

  upcomingBillLoading:
    "Accessible name for the next-bill card while it loads. Read aloud, never seen.",
  upcomingBillHeader:
    "Heading of the next-bill card. {{date}} is when the company will be charged.",
  upcomingBillHeaderUndated:
    "Heading of the next-bill card when the billing provider gives no date.",
  upcomingBillEstimate:
    "Sits beside the amount. The bill is an estimate: usage before the billing date can still change it.",
  upcomingBillEmpty:
    "Replaces the card's contents when the company has nothing to be billed for.",
  upcomingBillBalanceApplied:
    "Row label. Account credit that this invoice will use up. The amount beside it is negative.",
  upcomingBillBalanceRemaining:
    "Row label. Account credit still left after this invoice is paid.",
  upcomingBillDiscount: "Row label over each discount applied to the bill.",
  upcomingBillDiscountValue:
    'What a discount takes off, e.g. "20% off" or "$5.00 off". {{value}} is already formatted.',
  upcomingBillDiscountRepeating_one:
    'A discount that repeats for one more billing month, e.g. "20% off for 1 month".',
  upcomingBillDiscountRepeating_other:
    'A discount that repeats for a fixed number of billing months, e.g. "20% off for 3 months".',
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
  return (
    lookup(DEFAULT_STRINGS, key, vars) ??
    (DEFAULT_STRINGS as StringCatalog)[key] ??
    key
  );
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
  for (const key of STRING_KEYS) {
    bundle[key] = DEFAULT_STRINGS[key];
    bundle[`@${key}`] = { description: STRING_DESCRIPTIONS[key] };
  }
  return bundle;
}

export type { Translate };
