/** Formatting helpers for money, dates, and billing periods. */

const DEFAULT_CURRENCY = "USD";
const MAXIMUM_SIGNIFICANT_DIGITS = 6;

/**
 * Currencies whose amounts are already in the smallest unit — they must not be
 * divided by 100. Matches Stripe's zero-decimal list.
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

export interface FormatCurrencyOptions {
  /**
   * Whether fractional amounts switch to significant-digit formatting.
   * Default true. Set false for derived values such as a yearly price shown
   * as a monthly equivalent, where a repeating decimal is noise rather than
   * a meaningful sub-cent rate.
   */
  significantDigits?: boolean;
}

/**
 * Formats an amount in the currency's minor unit as a currency string.
 * Negative amounts render accounting-style — "($10.00)" — since in billing
 * they represent credits.
 *
 * Sub-unit amounts are common for usage pricing (an overage tier may be
 * $0.004 per unit) and must not be rounded away at two fraction digits, so
 * fractional inputs switch to significant-digit formatting.
 */
export function formatCurrency(
  cents: number,
  currency = "usd",
  options: FormatCurrencyOptions = {},
): string {
  const resolvedCurrency = (
    currency === "" ? DEFAULT_CURRENCY : currency
  ).toUpperCase();
  const divisor = ZERO_DECIMAL_CURRENCIES.has(resolvedCurrency) ? 1 : 100;
  const magnitude = Math.abs(cents);
  const hasManySignificantDigits =
    (options.significantDigits ?? true) &&
    /[1-9]/.test((magnitude % 1).toFixed(MAXIMUM_SIGNIFICANT_DIGITS));

  const intlOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency: resolvedCurrency,
    ...(hasManySignificantDigits && {
      minimumSignificantDigits: 1,
      maximumSignificantDigits: 12,
    }),
  };

  let formatted: string;
  try {
    formatted = new Intl.NumberFormat("en-US", intlOptions).format(
      magnitude / divisor,
    );
  } catch {
    // Unknown/invalid currency code: fall back rather than crashing a render.
    formatted = new Intl.NumberFormat("en-US", {
      ...intlOptions,
      currency: DEFAULT_CURRENCY,
    }).format(magnitude / divisor);
  }

  return cents < 0 ? `(${formatted})` : formatted;
}

export function formatDate(date: Date | string | undefined | null): string {
  if (date == null) {
    return "";
  }
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

const PERIOD_SUFFIXES: Record<string, string> = {
  "month": "/mo",
  "quarter": "/qtr",
  "year": "/yr",
  "one-time": "",
};

/** "/mo", "/qtr", "/yr" — empty string for one-time or unknown periods. */
export function periodSuffix(period: string | undefined | null): string {
  if (period == null || period === "") {
    return "";
  }
  return PERIOD_SUFFIXES[period] ?? "";
}

/** Periods that can be shown as a monthly-equivalent price, and their divisor. */
const MONTHLY_EQUIVALENT: Record<string, { divisor: number; suffix: string }> =
  {
    year: { divisor: 12, suffix: "/month, billed yearly" },
    quarter: { divisor: 3, suffix: "/month, billed quarterly" },
  };

export interface DisplayPrice {
  /** The amount to render, divided down when showing a monthly equivalent. */
  amount: number;
  /** Period suffix to render next to the amount. */
  suffix: string;
  /** True when `amount` was divided down from the real billed price. */
  isMonthlyEquivalent: boolean;
}

/**
 * Resolves how a plan price should be presented for a period, honoring the
 * account's `showAsMonthlyPrices` display setting — a yearly plan configured
 * that way advertises "$49/month, billed yearly" rather than "$588/yr".
 */
export function getDisplayPrice(
  amount: number,
  period: string | undefined | null,
  showAsMonthlyPrices = false,
): DisplayPrice {
  const monthly =
    showAsMonthlyPrices && period != null && period !== ""
      ? MONTHLY_EQUIVALENT[period]
      : undefined;
  if (monthly !== undefined) {
    return {
      amount: amount / monthly.divisor,
      suffix: monthly.suffix,
      isMonthlyEquivalent: true,
    };
  }
  return { amount, suffix: periodSuffix(period), isMonthlyEquivalent: false };
}

const PERIOD_NAMES: Record<string, string> = {
  month: "month",
  quarter: "quarter",
  year: "year",
};

export function periodName(
  period: string | undefined | null,
): string | undefined {
  if (period == null || period === "") {
    return undefined;
  }
  return PERIOD_NAMES[period];
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
