import type { PriceCadence, PriceInterval } from "@schematichq/schematic-react";

/**
 * The display period vocabulary. The API keeps the provider encoding
 * (`interval` + `intervalCount`); this module is the ONE place that maps it
 * to a period, so every element and derivation agrees on what "quarter" is.
 */
export type PricePeriod = "month" | "one_time" | "quarter" | "year";

/** Recurring periods in ascending length — the order toggles offer them. */
export const RECURRING_PERIODS: readonly PricePeriod[] = [
  "month",
  "quarter",
  "year",
];

/**
 * Maps a provider interval to a display period. Quarterly is stored as
 * `month × 3`; anything else unsupported by the display (weekly, daily,
 * `month × 6`) yields `null` so callers skip the price rather than mislabel it.
 */
export function derivePeriod(
  interval: PriceInterval | string,
  intervalCount: number = 1,
): PricePeriod | null {
  switch (interval) {
    case "one-time":
      return "one_time";
    case "year":
      return intervalCount === 1 ? "year" : null;
    case "month":
      if (intervalCount === 1) return "month";
      if (intervalCount === 3) return "quarter";
      if (intervalCount === 12) return "year";
      return null;
    default:
      return null;
  }
}

/** `available_periods` cadence → display period. */
export function periodFromCadence(cadence: PriceCadence): PricePeriod {
  switch (cadence) {
    case "monthly":
      return "month";
    case "quarterly":
      return "quarter";
    case "yearly":
      return "year";
  }
}

/** Months in a recurring period, for monthly-equivalent prices. */
export function monthsInPeriod(period: PricePeriod): number {
  switch (period) {
    case "month":
      return 1;
    case "quarter":
      return 3;
    case "year":
      return 12;
    case "one_time":
      return 0;
  }
}

/** "/month"-style suffix word. */
export const PERIOD_WORD: Record<PricePeriod, string> = {
  month: "month",
  one_time: "one-time",
  quarter: "quarter",
  year: "year",
};

/** "/mo"-style suffix. */
export const PERIOD_SHORT: Record<PricePeriod, string> = {
  month: "mo",
  one_time: "once",
  quarter: "qtr",
  year: "yr",
};

/** "Billed monthly"-style adverb. */
export const PERIOD_ADVERB: Record<PricePeriod, string> = {
  month: "monthly",
  one_time: "once",
  quarter: "quarterly",
  year: "yearly",
};
