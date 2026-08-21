import { pluralize } from "./pluralize";

/**
 * Locale-dependent formatting, all `Intl`-based. Every function takes the
 * locale explicitly so the derivations stay pure; the elements resolve it
 * once (prop, else `navigator.language`) and pass it down.
 */

export const DEFAULT_LOCALE = "en-US";

/** Resolves the viewer's locale when none is configured. SSR-safe. */
export function resolveLocale(locale?: string): string {
  if (locale !== undefined && locale !== "") {
    return locale;
  }
  if (typeof navigator !== "undefined" && navigator.language !== "") {
    return navigator.language;
  }
  return DEFAULT_LOCALE;
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

/** Credit consumption rates are stored to 10 decimal places (rates as small as 1e-10). */
const MAXIMUM_FRACTION_DIGITS = 10;
const MAXIMUM_SIGNIFICANT_DIGITS = 6;

/** Minor units → major units for the currency. */
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
  const { preserveSubUnitPrecision = true } = options;
  const major = toMajorUnits(amountMinor, resolvedCurrency);
  const hasSubUnitPrecision =
    preserveSubUnitPrecision &&
    /[1-9]/.test((amountMinor % 1).toFixed(MAXIMUM_SIGNIFICANT_DIGITS));

  try {
    return new Intl.NumberFormat(locale, {
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
    return `${formatNumber(major, locale, { minimumFractionDigits: 2 })} ${resolvedCurrency}`;
  }
}

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Credits per use, readable down to 1e-10 rather than "0" or "1e-10". */
export function formatConsumptionRate(rate: number, locale: string): string {
  return formatNumber(rate, locale, {
    maximumFractionDigits: MAXIMUM_FRACTION_DIGITS,
  });
}

/** "50%" with no fraction digits unless needed. */
export function formatPercent(fraction: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(fraction);
}

/** "August 21, 2026". Renders in the viewer's time zone. */
export function formatDate(
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

/** "8/21" — the compact form used beside meters. */
export function formatShortDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

/**
 * The singular or plural name of a feature or credit for a count. Explicit
 * `singularName` / `pluralName` win; otherwise the base name is pluralized.
 * A count of 0 reads as plural ("0 seats").
 */
export function featureName(
  named: {
    name: string;
    singularName?: string | null;
    pluralName?: string | null;
  },
  count = 0,
): string {
  const plural = count === 0 || count > 1;
  const singularName = orNull(named.singularName);
  const pluralName = orNull(named.pluralName);

  if (pluralName !== null && plural) {
    return pluralName;
  }
  if (singularName !== null) {
    return plural ? pluralize(singularName, count) : singularName;
  }
  return pluralize(named.name, count);
}

/** Treats the API's empty-string names as absent. */
function orNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}

export { pluralize };
