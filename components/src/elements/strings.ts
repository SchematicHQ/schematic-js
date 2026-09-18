import type { Translate } from "@schematichq/schematic-react";

/**
 * The elements ship English only. A host overrides copy through `strings`
 * or routes it through its own `translate`, which then owns plurals and
 * interpolation.
 */

/** The defaults are English, so their plural forms resolve under English rules. */
export const DEFAULT_STRINGS_LOCALE = "en";

/**
 * Only the copy the elements render. A host building its own markup owns its
 * own labels and headers; those are not keys here.
 *
 * Plural forms follow i18next's `key_one` / `key_other` convention, looked
 * up by the bare `key` with `{ count }`.
 */
export type ElementStrings = {
  retry: string;

  invoicesLoading: string;
  invoicesHeader: string;
  invoicesError: string;
  invoicesUnavailable: string;
  invoicesEmpty: string;
  invoicesSeeMore: string;
  invoicesSeeLess: string;
  invoicesLoadMore: string;
  invoicesChargeTooltip: string;
  invoicesCreditTooltip: string;
  invoicesUndated: string;

  upcomingBillLoading: string;
  upcomingBillHeader: string;
  upcomingBillError: string;
  upcomingBillUnavailable: string;
  upcomingBillEmpty: string;
  upcomingBillEstimate: string;
  upcomingBillBalanceApplied: string;
  upcomingBillBalanceRemaining: string;
  upcomingBillDiscount: string;
  upcomingBillDiscountValue: string;
  upcomingBillDiscountRepeating: string;

  paymentMethodsLoading: string;
  paymentMethodsHeader: string;
  paymentMethodsError: string;
  paymentMethodsUnavailable: string;
  paymentMethodsEmpty: string;
  paymentMethodsAdd: string;
  paymentMethodsRemove: string;
  paymentMethodsMakeDefault: string;
  paymentMethodsDefault: string;
  paymentMethodsLast4: string;
  paymentMethodsExpires: string;
  paymentMethodsExpiresSoon: string;
  paymentMethodsExpired: string;
  paymentMethodsFormLoading: string;
  paymentMethodsSave: string;
  paymentMethodsSaveError: string;
  paymentMethodsCancel: string;
};

export type StringKey = keyof ElementStrings;

/** A flat catalogue, the shape of both a host's `strings` and the defaults. */
export type StringCatalog = Record<string, string | undefined>;

/** The i18next plural suffixes a key can carry. */
type PluralSuffix = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * Copy overrides, on the provider or on an element. Plural spellings are
 * accepted so an override can vary by count rather than answering `1` and
 * `14` with the same words.
 */
export type StringOverrides = Partial<ElementStrings> &
  Partial<Record<`${StringKey}_${PluralSuffix}`, string>>;

/** Interpolation values, and `count` for the plural form. */
export type StringVars = Record<string, unknown>;

export type Translator = (key: StringKey, vars?: StringVars) => string;

/**
 * The English copy, and the fallback for anything a host does not answer.
 * It is a plain resource bundle, so it can be registered as one:
 *
 * ```ts
 * i18n.addResourceBundle("en", "schematic", DEFAULT_STRINGS);
 * ```
 *
 * Registering it is optional: the elements render the English themselves on
 * a miss.
 *
 * Also typed as a catalogue so plural variants can sit beside the bare key
 * they inflect.
 */
export const DEFAULT_STRINGS: ElementStrings & StringCatalog = {
  retry: "Try again",

  invoicesLoading: "Loading invoices",
  invoicesHeader: "Invoices",
  invoicesError: "There was a problem retrieving your invoices.",
  invoicesUnavailable: "Invoices are not available for this account.",
  invoicesEmpty: "No invoices created yet",
  invoicesSeeMore: "See more",
  invoicesSeeLess: "See less",
  invoicesLoadMore: "Load more",
  invoicesChargeTooltip: "Charge — you were billed this amount",
  invoicesCreditTooltip:
    "Credit — this amount was returned to your account, typically due to a plan change or proration",
  invoicesUndated: "View invoice",

  upcomingBillLoading: "Loading your next bill",
  upcomingBillHeader: "Next bill due {{date}}",
  upcomingBillError: "There was a problem retrieving your upcoming invoice.",
  upcomingBillUnavailable:
    "Your upcoming invoice is not available for this account.",
  upcomingBillEmpty: "No upcoming invoice",
  upcomingBillEstimate: "Estimated bill",
  upcomingBillBalanceApplied: "Applied balance towards next invoice",
  upcomingBillBalanceRemaining: "Remaining balance after next invoice",
  upcomingBillDiscount: "Discount",
  upcomingBillDiscountValue: "{{value}} off",
  // Looked up by the bare key with `{ count }`; English has two forms.
  upcomingBillDiscountRepeating: "{{value}} off for next {{count}} months",
  upcomingBillDiscountRepeating_one: "{{value}} off for next month",
  upcomingBillDiscountRepeating_other:
    "{{value}} off for next {{count}} months",

  paymentMethodsLoading: "Loading payment methods",
  paymentMethodsHeader: "Payment methods",
  paymentMethodsError: "Could not load payment methods",
  paymentMethodsUnavailable: "Payment methods are not available",
  paymentMethodsEmpty: "No payment method on file",
  paymentMethodsAdd: "Add",
  paymentMethodsRemove: "Remove",
  paymentMethodsMakeDefault: "Make default",
  paymentMethodsDefault: "Default",
  paymentMethodsLast4: "···· {{last4}}",
  paymentMethodsExpires: "Expires {{date}}",
  paymentMethodsExpiresSoon: "Expires soon · {{date}}",
  paymentMethodsExpired: "Expired {{date}}",
  paymentMethodsFormLoading: "Loading payment form",
  paymentMethodsSave: "Save",
  paymentMethodsSaveError: "Could not save the payment method",
  paymentMethodsCancel: "Cancel",
};

/**
 * Passed to a host's `translate` as `defaultValue` so a miss is detectable
 * from a stack that answers every key. The leading NUL is nothing a real
 * catalogue would contain.
 */
export const MISSING_STRING = "\u0000schematic:missing";

/**
 * Fills `{{name}}` placeholders, i18next style. A placeholder with no value
 * is left as written so the omission is visible.
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

/** `other` when `Intl` rejects the locale. */
function pluralCategory(count: number, locale: string): Intl.LDMLPluralRule {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return "other";
  }
}

/**
 * `locale` is the language the catalogue is written in, since that decides
 * its plural forms: English for the defaults, the resolved locale for a
 * host's overrides. Returns `undefined` on a miss so callers can fall
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
 * Bottoms out at the key itself, so the `Translator` return type holds even
 * for a key the catalogue lacks.
 */
export function defaultString(key: StringKey, vars?: StringVars): string {
  return lookup(DEFAULT_STRINGS, key, vars) ?? DEFAULT_STRINGS[key] ?? key;
}

export type { Translate };
