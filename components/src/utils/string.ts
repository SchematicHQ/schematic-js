import { DEFAULT_CURRENCY, MAXIMUM_SIGNIFICANT_DIGITS } from "../const";

export function hyphenToCamel(str: string) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

export function camelToHyphen(str: string) {
  return str.replace(/([a-z][A-Z])/g, (g) => `${g[0]}-${g[1].toLowerCase()}`);
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatCurrency(amount: number, currency?: string) {
  const resolvedCurrency = (currency || DEFAULT_CURRENCY).toUpperCase();

  try {
    const dollars = amount / 100;

    const formatValue = (value: number, symbol: string): string => {
      let formatted = value.toFixed(1);
      if (formatted.endsWith(".0")) {
        formatted = formatted.slice(0, -2);
      }

      if (resolvedCurrency !== DEFAULT_CURRENCY) {
        return `${resolvedCurrency}${formatted}${symbol}`;
      }

      return `$${formatted}${symbol}`;
    };

    if (dollars >= 1_000_000) {
      formatValue(dollars / 1_000_000, "M");
    }

    if (dollars >= 1_000) {
      return formatValue(dollars / 1_000, "k");
    }

    const hasManySignificantDigits = /[1-9]/.test(
      (amount % 1.0).toFixed(MAXIMUM_SIGNIFICANT_DIGITS),
    );

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: resolvedCurrency,
      ...(hasManySignificantDigits && {
        minimumSignificantDigits: 1,
      }),
    }).format(dollars);
  } catch (error) {
    console.error("Error formatting currency", error);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: resolvedCurrency,
    }).format(amount / 100);
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
