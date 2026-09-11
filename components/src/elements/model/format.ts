// `pluralize` inflects English and nothing else, so it stays internal to
// `featureName` below rather than becoming public API on a package whose
// whole point is that the host owns the words. It is a leaf module with no
// imports of its own, so taking it from `utils` pulls in nothing else.
import { pluralize } from "../../utils/pluralize";

/** Every function takes the locale explicitly so derivations stay pure. */

export const DEFAULT_LOCALE = "en-US";

/** Capped because the keys are caller-supplied. */
const usableLocales = new Map<string, boolean>();
const MAX_CACHED_LOCALES = 64;

/** `en_US` is the common typo, and every `Intl` constructor throws on it. */
function isUsableLocale(locale: string): boolean {
  const cached = usableLocales.get(locale);
  if (cached !== undefined) {
    return cached;
  }
  let usable = true;
  try {
    Intl.getCanonicalLocales(locale);
  } catch {
    usable = false;
  }
  if (usableLocales.size >= MAX_CACHED_LOCALES) {
    usableLocales.clear();
  }
  usableLocales.set(locale, usable);
  return usable;
}

/** A bad tag is a typo in one prop; it must not throw inside a render. */
function usableLocale(locale: string): string {
  return isUsableLocale(locale) ? locale : DEFAULT_LOCALE;
}

/**
 * The tag to format in: the one given, or the default when it is absent or
 * `Intl` cannot take it.
 *
 * Pure, and deliberately blind to the viewer: reading `navigator` here would
 * make a server render and its hydration disagree on every formatted date.
 * `viewerLocale()` is that reading, and `useResolvedLocale` folds it in after
 * mount, where the two renders have already matched.
 */
export function resolveLocale(locale?: string): string {
  return locale !== undefined && locale !== "" && isUsableLocale(locale)
    ? locale
    : DEFAULT_LOCALE;
}

/** Read this in an effect, never in a render the server also performs. */
export function viewerLocale(): string | undefined {
  if (typeof navigator === "undefined" || navigator.language === "") {
    return undefined;
  }
  return isUsableLocale(navigator.language) ? navigator.language : undefined;
}

/**
 * Currencies whose minor unit IS the major unit (no cents). Matches the
 * Stripe list; amounts in these currencies are not divided by 100.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

/** Rates are stored to 10 decimal places (as small as 1e-10). */
const MAXIMUM_FRACTION_DIGITS = 10;
const MAXIMUM_SIGNIFICANT_DIGITS = 6;

export function toMajorUnits(amountMinor: number, currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
    ? amountMinor
    : amountMinor / 100;
}

export interface FormatCurrencyOptions {
  /**
   * When the amount has sub-minor-unit precision (e.g. a $0.0015 per-unit
   * price), render enough significant digits to show it instead of rounding
   * to the currency's usual precision. Default true.
   */
  preserveSubUnitPrecision?: boolean;
}

/**
 * Formats a minor-unit amount in its currency for the locale. Negative
 * amounts format with the locale's sign; callers wanting accounting
 * parentheses wrap the absolute value themselves.
 */
export function formatCurrency(
  amountMinor: number,
  currency: string,
  locale: string,
  options: FormatCurrencyOptions = {},
): string {
  const resolvedCurrency = currency.toUpperCase();
  const resolvedLocale = usableLocale(locale);
  const { preserveSubUnitPrecision = true } = options;
  const major = toMajorUnits(amountMinor, resolvedCurrency);
  const hasSubUnitPrecision =
    preserveSubUnitPrecision &&
    /[1-9]/.test((amountMinor % 1).toFixed(MAXIMUM_SIGNIFICANT_DIGITS));

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: resolvedCurrency,
      ...(hasSubUnitPrecision && {
        minimumSignificantDigits: 1,
        maximumSignificantDigits: 12,
      }),
    }).format(major);
  } catch {
    // An unknown currency code throws; fall back to a plain number with the
    // code beside it rather than rendering nothing.
    return `${formatNumber(major, resolvedLocale, { minimumFractionDigits: 2 })} ${resolvedCurrency}`;
  }
}

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(usableLocale(locale), options).format(value);
}

/** Credits per use, readable down to 1e-10 rather than "0" or "1e-10". */
export function formatConsumptionRate(rate: number, locale: string): string {
  return formatNumber(rate, locale, {
    maximumFractionDigits: MAXIMUM_FRACTION_DIGITS,
  });
}

/**
 * A date `Intl` can format, or `undefined`. A row whose timestamp the API
 * sent malformed decodes to an Invalid Date, and `format()` throws a
 * RangeError on one — from inside a render, where it escapes the element's
 * status frame and takes the host's tree with it.
 */
export function usableDate(date: Date | null | undefined): Date | undefined {
  if (date === null || date === undefined) {
    return undefined;
  }

  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** "August 21, 2026". Renders in the viewer's time zone. Empty for a date that is not one. */
export function formatDate(
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (usableDate(date) === undefined) {
    return "";
  }

  return new Intl.DateTimeFormat(usableLocale(locale), {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

/** "8/21" — the compact form used beside meters. Empty for a date that is not one. */
export function formatShortDate(date: Date, locale: string): string {
  if (usableDate(date) === undefined) {
    return "";
  }

  return new Intl.DateTimeFormat(usableLocale(locale), {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

/**
 * The singular or plural name of a feature or credit for a count.
 *
 * Feature names are the company's own words, so the forms it configured win:
 * `singularName` for the locale's "one" category, `pluralName` otherwise.
 * With no `pluralName` the name has to be inflected, and English suffix
 * rules are the only ones we have — so they apply to English locales and
 * every other language keeps the name the company gave us rather than
 * getting "Sitzplatzs".
 *
 * The category comes from `Intl.PluralRules`, so 0 reads as plural in
 * English ("0 seats") and as "one" in the languages where it is.
 */
export function featureName(
  named: {
    name: string;
    singularName?: string | null;
    pluralName?: string | null;
  },
  count = 0,
  locale: string = DEFAULT_LOCALE,
): string {
  const isOne = pluralCategory(count, locale) === "one";
  const singularName = orNull(named.singularName) ?? named.name;
  const pluralName = orNull(named.pluralName);

  if (isOne) {
    return singularName;
  }
  if (pluralName !== null) {
    return pluralName;
  }
  return isEnglish(locale) ? pluralize(singularName, 2) : singularName;
}

/**
 * `other` is required because every language has it; supply the categories
 * the language uses — Polish needs `one`, `few` and `many`, Japanese none.
 * For hosts rendering their own copy, the elements ship English.
 */
export function plural(
  locale: string,
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
): string {
  return forms[pluralCategory(count, locale)] ?? forms.other;
}

function pluralCategory(count: number, locale: string): Intl.LDMLPluralRule {
  return new Intl.PluralRules(usableLocale(locale)).select(count);
}

function isEnglish(locale: string): boolean {
  return new Intl.Locale(usableLocale(locale)).language === "en";
}

/** The API sends an absent name as an empty string. */
function orNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}
