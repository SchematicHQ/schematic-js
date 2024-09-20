export function hyphenToCamel(str: string) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

export function camelToHyphen(str: string) {
  return str.replace(/([a-z][A-Z])/g, (g) => `${g[0]}-${g[1].toLowerCase()}`);
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatCurrency(amount: number) {
  try {
    const dollars = amount / 100;

    const formatValue = (value: number, symbol: string): string => {
      let formatted = value.toFixed(1);
      if (formatted.endsWith(".0")) {
        formatted = formatted.slice(0, -2);
      }
      return `$${formatted}${symbol}`;
    };

    if (dollars >= 1_000_000) {
      return formatValue(dollars / 1_000_000, "M");
    } else if (dollars >= 1_000) {
      return formatValue(dollars / 1_000, "k");
    } else {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(dollars);
    }
  } catch (error) {
    console.error("Error formatting currency", error);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
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
