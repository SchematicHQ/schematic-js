import { DEFAULT_CURRENCY, MAXIMUM_SIGNIFICANT_DIGITS } from "../const";

/**
 * Zero-decimal currencies where amounts are already in the smallest unit
 * (i.e. no cents). Matches the Stripe list.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export function hyphenToCamel(str: string) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

export function camelToHyphen(str: string) {
  return str.replace(/([a-z][A-Z])/g, (g) => `${g[0]}-${g[1].toLowerCase()}`);
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("en-US").format(num);
}

interface FormatCurrencyOptions {
  currency?: string;
  testSignificantDigits?: boolean;
}

export function formatCurrency(
  amount: number,
  options?:
    | FormatCurrencyOptions
    | FormatCurrencyOptions["currency"]
    | FormatCurrencyOptions["testSignificantDigits"],
) {
  let currency = DEFAULT_CURRENCY;
  let testSignificantDigits = true;

  switch (typeof options) {
    case "string":
      currency = options;
      break;
    case "boolean":
      testSignificantDigits = options;
      break;
    case "object": {
      if (typeof options.currency === "string") {
        currency = options.currency;
      }

      if (typeof options.testSignificantDigits === "boolean") {
        testSignificantDigits = options.testSignificantDigits;
      }

      break;
    }
  }

  const resolvedCurrency = currency.toUpperCase();
  const divisor = ZERO_DECIMAL_CURRENCIES.has(resolvedCurrency) ? 1 : 100;

  try {
    const dollars = amount / divisor;

    const hasManySignificantDigits =
      testSignificantDigits &&
      /[1-9]/.test((amount % 1.0).toFixed(MAXIMUM_SIGNIFICANT_DIGITS));

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: resolvedCurrency,
      ...(hasManySignificantDigits && {
        minimumSignificantDigits: 1,
        maximumSignificantDigits: 12,
      }),
    }).format(dollars);
  } catch (err) {
    console.error("Error formatting currency", err);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      minimumFractionDigits: 2,
      maximumSignificantDigits: 12,
      currency: resolvedCurrency,
    }).format(amount / divisor);
  }
}

export function formatOrdinal(n: number) {
  const enOrdinalRules = new Intl.PluralRules("en-US", { type: "ordinal" });
  const suffixes = new Map([
    ["one", "st"],
    ["two", "nd"],
    ["few", "rd"],
    ["other", "th"],
  ]);
  const rule = enOrdinalRules.select(n);
  const suffix = suffixes.get(rule);

  return `${n}${suffix}`;
}

export function adjectify(str: string) {
  return `${str}ly`;
}

const CURRENCY_FLAGS: Record<string, string> = {
  usd: "🇺🇸", gbp: "🇬🇧", jpy: "🇯🇵", cad: "🇨🇦", aud: "🇦🇺",
  chf: "🇨🇭", cny: "🇨🇳", krw: "🇰🇷", inr: "🇮🇳", brl: "🇧🇷",
  mxn: "🇲🇽", sgd: "🇸🇬", hkd: "🇭🇰", nok: "🇳🇴", sek: "🇸🇪",
  dkk: "🇩🇰", nzd: "🇳🇿", zar: "🇿🇦", try: "🇹🇷", thb: "🇹🇭",
  pln: "🇵🇱", twd: "🇹🇼", ils: "🇮🇱", php: "🇵🇭", czk: "🇨🇿",
  clp: "🇨🇱", cop: "🇨🇴", myr: "🇲🇾", idr: "🇮🇩", vnd: "🇻🇳",
  aed: "🇦🇪", sar: "🇸🇦", egp: "🇪🇬", ngn: "🇳🇬", ars: "🇦🇷",
  pen: "🇵🇪", uah: "🇺🇦", ron: "🇷🇴", bgn: "🇧🇬", huf: "🇭🇺",
  isk: "🇮🇸",
  eur: "🇪🇺",
};

export function getCurrencyFlag(currency: string): string {
  return CURRENCY_FLAGS[currency.toLowerCase()] ?? "";
}

export function getCurrencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);

    return parts.find((part) => part.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}
