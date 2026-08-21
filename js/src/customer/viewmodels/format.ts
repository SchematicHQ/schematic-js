/**
 * Locale-aware formatting primitives for the view-model builders. Builders
 * emit structured parts plus Intl-formatted numerals; sentence assembly and
 * translation stay with the consumer.
 */

/**
 * ISO currencies whose minor unit is the major unit — Stripe reports their
 * amounts un-divided.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

export interface FormatOptions {
  locale?: string;
}

/** Converts a Stripe minor-unit amount to the currency's major unit. */
export const amountFromMinorUnits = (
  amountCents: number,
  currency: string,
): number => {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())
    ? amountCents
    : amountCents / 100;
};

/**
 * Formats a minor-unit amount as currency. Sub-cent precision (per-unit
 * usage prices like $0.0015) switches to significant digits instead of
 * rounding to zero.
 */
export const formatCurrency = (
  amountCents: number,
  currency: string,
  options?: FormatOptions & { accountingSign?: boolean },
): string => {
  const amount = amountFromMinorUnits(amountCents, currency);
  const abs = Math.abs(amount);
  const subCent = abs > 0 && abs < 0.01;
  try {
    return new Intl.NumberFormat(options?.locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      ...(options?.accountingSign === true
        ? { currencySign: "accounting" as const }
        : {}),
      ...(subCent
        ? { minimumSignificantDigits: 1, maximumSignificantDigits: 2 }
        : {}),
    }).format(amount);
  } catch {
    // Unknown currency codes still deserve a readable amount.
    return `${amount} ${currency.toUpperCase()}`;
  }
};

/**
 * Formats an amount already expressed in the currency's major unit (e.g.
 * the server's effective_price, which arrives pre-divided).
 */
export const formatCurrencyMajorUnits = (
  amount: number,
  currency: string,
  options?: FormatOptions,
): string => {
  const abs = Math.abs(amount);
  const subCent = abs > 0 && abs < 0.01;
  try {
    return new Intl.NumberFormat(options?.locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      ...(subCent
        ? { minimumSignificantDigits: 1, maximumSignificantDigits: 2 }
        : {}),
    }).format(amount);
  } catch {
    return `${amount} ${currency.toUpperCase()}`;
  }
};

export const formatNumber = (
  value: number,
  options?: FormatOptions,
): string => {
  return new Intl.NumberFormat(options?.locale).format(value);
};

/**
 * Formats a credit consumption rate without rounding tiny rates to zero
 * (rates like 0.0000000001 credits/unit are valid configuration).
 */
export const formatConsumptionRate = (
  rate: number,
  options?: FormatOptions,
): string => {
  return new Intl.NumberFormat(options?.locale, {
    maximumFractionDigits: 10,
  }).format(rate);
};

export const formatDate = (date: Date, options?: FormatOptions): string => {
  return new Intl.DateTimeFormat(options?.locale, {
    dateStyle: "medium",
  }).format(date);
};

export interface FeatureNameParts {
  featureName: string;
  featurePluralName?: string | null;
  featureSingularName?: string | null;
}

/**
 * Whether an optional API string is actually configured: the API serializes
 * unset names as null or the empty string depending on the field.
 */
export const isConfigured = (
  value: string | null | undefined,
): value is string => value != null && value !== "";

/**
 * Resolves a feature's display name for a count, honoring author-configured
 * singular/plural names. Without a configured plural the base name is used
 * as-is — no client-side inflection tables. The API serializes unconfigured
 * names as empty strings, so those fall back too.
 */
export const featureNameForCount = (
  parts: FeatureNameParts,
  count: number,
): string => {
  if (count === 1) {
    return isConfigured(parts.featureSingularName)
      ? parts.featureSingularName
      : parts.featureName;
  }
  return isConfigured(parts.featurePluralName)
    ? parts.featurePluralName
    : parts.featureName;
};
