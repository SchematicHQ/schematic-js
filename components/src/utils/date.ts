import type { Translate } from "../localization";

/** `locale` is the BCP 47 tag from `useTranslation`. */
export interface DateFormatOptions extends Intl.DateTimeFormatOptions {
  locale: string;
}

export function toPrettyDate(
  date: Date | string,
  { locale, ...format }: DateFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...format,
  }).format(new Date(date));
}

export function getMonthName(
  date: Date | string,
  { locale, ...format }: DateFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    ...format,
  }).format(new Date(date));
}

// Stripe has no quarter interval: a quarterly price is a monthly interval
// billed every 3 months, and a yearly price can be a monthly interval billed
// every 12. Display folds both into their named period.
const QUARTERLY_INTERVAL_COUNT = 3;
const YEARLY_INTERVAL_COUNT = 12;

/**
 * Folds month×3 into "quarter" and month×12 into "year". Any other count of
 * more than one is kept, and a missing count is one.
 */
export function normalizeInterval(
  interval: string,
  intervalCount?: number | null,
): { period: string; count: number } {
  const count = intervalCount && intervalCount > 1 ? intervalCount : 1;
  if (interval === "month" && count === QUARTERLY_INTERVAL_COUNT) {
    return { period: "quarter", count: 1 };
  }
  if (interval === "month" && count === YEARLY_INTERVAL_COUNT) {
    return { period: "year", count: 1 };
  }
  return { period: interval, count };
}

/**
 * The short period that follows a price: "mo", "qtr", "yr", "wk", "day", or
 * a counted one like "4mo" or "2yr". Pass the price's interval count, since a
 * quarterly or yearly price can be interval "month" with a count of 3 or 12.
 * The abbreviations are bundle keys, so a translation owns them.
 */
export function shortenPeriod(
  period: string,
  t: Translate,
  intervalCount?: number | null,
) {
  const { period: unit, count } = normalizeInterval(period, intervalCount);

  if (count > 1) {
    switch (unit) {
      case "day":
        return t("X days short", { amount: count });
      case "week":
        return t("X weeks short", { amount: count });
      case "month":
        return t("X months short", { amount: count });
      case "year":
        return t("X years short", { amount: count });
    }
    return;
  }

  switch (unit) {
    case "day":
      return t("day");
    case "week":
      return t("wk");
    case "month":
      return t("mo");
    case "quarter":
      return t("qtr");
    case "year":
      return t("yr");
  }
}

/**
 * The period spelled out for a sentence: "month", "quarter", "year", or a
 * counted one like "4 months". An unknown period passes through.
 */
export function nameInterval(
  period: string,
  t: Translate,
  intervalCount?: number | null,
): string {
  const { period: unit, count } = normalizeInterval(period, intervalCount);

  if (count > 1) {
    switch (unit) {
      case "day":
        return t("X days", { count });
      case "week":
        return t("X weeks", { count });
      case "month":
        return t("X months", { count });
      case "year":
        return t("X years", { count });
    }
    return period;
  }

  switch (unit) {
    case "day":
    case "week":
    case "month":
    case "quarter":
    case "year":
      return t(unit);
  }

  return period;
}

export function modifyDate(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
