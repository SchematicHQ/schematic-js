import type { Price, PriceTier, TiersMode } from "../contract";

import {
  RECURRING_PERIODS,
  derivePeriod,
  monthsInPeriod,
  type PricePeriod,
} from "./period";

/** The price's amount in minor units, honouring a sub-unit decimal when present. */
export function priceAmount(
  price: Pick<Price, "amount" | "amountDecimal">,
): number {
  if (price.amountDecimal !== null) {
    const parsed = Number(price.amountDecimal);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return price.amount;
}

/** The display period of a price, or `null` for an unsupported cadence. */
export function pricePeriod(price: Price): PricePeriod | null {
  return derivePeriod(price.interval, price.intervalCount);
}

export const sameCurrency = (a: string, b: string): boolean =>
  a.toLowerCase() === b.toLowerCase();

/** The price point for a period in a currency, if sold. */
export function findPrice(
  prices: Price[],
  period: PricePeriod,
  currency: string,
): Price | undefined {
  return prices.find(
    (price) =>
      sameCurrency(price.currency, currency) && pricePeriod(price) === period,
  );
}

/** Unique currencies across price points, lowercase, in order of appearance. */
export function currenciesOf(prices: Price[]): string[] {
  const seen: string[] = [];
  for (const price of prices) {
    const currency = price.currency.toLowerCase();
    if (!seen.includes(currency)) {
      seen.push(currency);
    }
  }
  return seen;
}

/** Recurring periods offered across price points, in toggle order. */
export function periodsOf(prices: Price[], currency?: string): PricePeriod[] {
  const offered = new Set<PricePeriod>();
  for (const price of prices) {
    if (currency !== undefined && !sameCurrency(price.currency, currency)) {
      continue;
    }
    const period = pricePeriod(price);
    if (period !== null && period !== "one_time") {
      offered.add(period);
    }
  }
  return RECURRING_PERIODS.filter((period) => offered.has(period));
}

/** Whether a price has tier bands that change the per-unit rate. */
export function isTiered(price: Price): boolean {
  return price.tiers.length > 1 || price.tiersMode !== null;
}

/** Per-unit minor units of a tier band, decimal-aware. */
export function tierUnitAmount(tier: PriceTier): number {
  if (tier.perUnitAmountDecimal !== null) {
    const parsed = Number(tier.perUnitAmountDecimal);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return tier.perUnitAmount ?? 0;
}

/** The band a quantity falls in. */
export function tierFor(
  tiers: PriceTier[],
  quantity: number,
): PriceTier | undefined {
  return tiers.find(
    (tier) =>
      quantity >= tier.from && (tier.to === null || quantity <= tier.to),
  );
}

/** The final band — the overage rate of an overage price. */
export function overageTier(price: Price): PriceTier | undefined {
  return price.tiers.length > 0
    ? price.tiers[price.tiers.length - 1]
    : undefined;
}

/**
 * Cost of a quantity under a tiered price, in minor units. Volume pricing
 * charges every unit at the band the total lands in; graduated pricing
 * charges each band's units at that band's rate.
 */
export function tieredCost(
  quantity: number,
  tiers: PriceTier[],
  tiersMode: TiersMode | null,
): number {
  if (quantity <= 0) {
    return 0;
  }
  if (tiersMode === "volume") {
    const band = tierFor(tiers, quantity) ?? tiers[tiers.length - 1];
    if (band === undefined) {
      return 0;
    }
    return quantity * tierUnitAmount(band) + (band.flatAmount ?? 0);
  }
  let cost = 0;
  let covered = 0;
  for (const band of tiers) {
    if (covered >= quantity) {
      break;
    }
    const upTo = band.to ?? Infinity;
    const units = Math.min(upTo, quantity) - covered;
    cost += (band.flatAmount ?? 0) + units * tierUnitAmount(band);
    covered += units;
  }
  return cost;
}

/**
 * Monthly-equivalent minor units of a recurring price; `null` for one-time.
 */
export function monthlyEquivalent(price: Price): number | null {
  const period = pricePeriod(price);
  if (period === null || period === "one_time") {
    return null;
  }
  return priceAmount(price) / monthsInPeriod(period);
}

/**
 * Savings of paying per `period` versus monthly, as a fraction of the monthly
 * total; `null` when either price is missing or there is no saving.
 */
export function periodSavings(
  prices: Price[],
  period: PricePeriod,
  currency: string,
): number | null {
  if (period === "month" || period === "one_time") {
    return null;
  }
  const monthly = findPrice(prices, "month", currency);
  const periodic = findPrice(prices, period, currency);
  if (monthly === undefined || periodic === undefined) {
    return null;
  }
  const monthlyTotal = priceAmount(monthly) * monthsInPeriod(period);
  const periodicTotal = priceAmount(periodic);
  if (
    monthlyTotal <= 0 ||
    periodicTotal <= 0 ||
    periodicTotal >= monthlyTotal
  ) {
    return null;
  }
  return (monthlyTotal - periodicTotal) / monthlyTotal;
}
