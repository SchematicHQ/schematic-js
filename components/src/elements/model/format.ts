// English-only, so it stays internal to `featureName` rather than becoming
// public API. A leaf module, so importing it pulls in nothing else.
import { pluralize } from "../../utils/pluralize";

export const DEFAULT_LOCALE = "en-US";

/** Bounded, since the keys are caller-supplied. */
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

/** A bad tag must not throw inside a render. */
function usableLocale(locale: string): string {
  return isUsableLocale(locale) ? locale : DEFAULT_LOCALE;
}

/**
 * The given tag, or the default when it is absent or `Intl` rejects it.
 * Deliberately ignores `navigator`; `viewerLocale` does that reading.
 */
export function resolveLocale(locale?: string): string {
  return locale !== undefined && locale !== "" && isUsableLocale(locale)
    ? locale
    : DEFAULT_LOCALE;
}

/** Not for a server render or its hydration; `useResolvedLocale` reads it
 * through `useSyncExternalStore`, which keeps it out of both. */
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
    // Only a malformed code (not three letters) throws; an unknown well-formed
    // one formats with the code as its symbol.
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
 * A malformed timestamp decodes to an Invalid Date, and `Intl` throws a
 * RangeError on formatting one. Thrown inside a render, that takes down the
 * host's tree.
 */
/** "50%" with no fraction digits unless needed. */
export function formatPercent(fraction: number, locale: string): string {
  return new Intl.NumberFormat(usableLocale(locale), {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(fraction);
}

export function usableDate(date: Date | null | undefined): Date | undefined {
  if (date === null || date === undefined) {
    return undefined;
  }

  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** "August 21, 2026", in the viewer's time zone. Empty for an Invalid Date. */
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

/** "8/21". Empty for an Invalid Date. */
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
 * Configured forms win. Without a `pluralName`, English locales inflect the
 * name with English suffix rules; other languages keep it as given rather
 * than getting "Sitzplatzs". The category comes from `Intl.PluralRules`, so
 * 0 is plural in English and "one" where a language says so.
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
 * `other` is required because every language has it. Supply whichever other
 * categories the language uses: Polish needs `one`, `few`, and `many`;
 * Japanese needs none.
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

/** A missing name arrives as null, undefined, or an empty string. */
function orNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}
