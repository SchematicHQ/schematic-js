import {
  BillingProductPriceInterval,
  PlanPriceCadence,
  type CatalogPriceResponseData,
} from "../api/public";

/**
 * Display cadence vocabulary for catalog prices.
 *
 * The API keeps the provider encoding (`interval` + `interval_count`) on
 * every tier — quarterly is stored as month×3 — and this module is the one
 * place that encoding is mapped to a display period (RFC 0008 §4.1).
 */
export const PricePeriod = {
  Month: "month",
  OneTime: "one_time",
  Quarter: "quarter",
  Year: "year",
} as const;
export type PricePeriod = (typeof PricePeriod)[keyof typeof PricePeriod];

/**
 * Maps a provider interval + interval_count pair to a display period.
 * Returns undefined for cadences the catalog never sells (e.g. daily).
 */
export const derivePeriod = (
  interval?: string | null,
  intervalCount?: number | null,
): PricePeriod | undefined => {
  switch (interval) {
    case BillingProductPriceInterval.OneTime:
      return PricePeriod.OneTime;
    case BillingProductPriceInterval.Year:
      return PricePeriod.Year;
    case BillingProductPriceInterval.Month:
      return intervalCount === 3 ? PricePeriod.Quarter : PricePeriod.Month;
    default:
      return undefined;
  }
};

/**
 * The display period of a catalog price. Catalog price slots are always
 * monthly / quarterly / yearly / one-time, so an unmappable interval is
 * treated as monthly rather than failing the whole card.
 */
export const pricePeriod = (
  price: Pick<CatalogPriceResponseData, "interval" | "intervalCount">,
): PricePeriod =>
  derivePeriod(price.interval, price.intervalCount) ?? PricePeriod.Month;

/** Maps a plan's recurring cadence (available_periods) to a display period. */
export const periodFromCadence = (
  cadence: PlanPriceCadence | string,
): PricePeriod => {
  switch (cadence) {
    case PlanPriceCadence.Quarterly:
      return PricePeriod.Quarter;
    case PlanPriceCadence.Yearly:
      return PricePeriod.Year;
    default:
      return PricePeriod.Month;
  }
};

/**
 * The periods a plan is actually sold at: its recurring cadences plus
 * one-time when a one-time price is offered (the server only emits
 * one_time_price for one-time plans).
 */
export const offeredPeriods = (plan: {
  availablePeriods: readonly (PlanPriceCadence | string)[];
  oneTimePrice?: unknown;
}): PricePeriod[] => [
  ...plan.availablePeriods.map(periodFromCadence),
  ...(plan.oneTimePrice !== undefined && plan.oneTimePrice !== null
    ? [PricePeriod.OneTime]
    : []),
];
